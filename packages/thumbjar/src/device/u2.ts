// A client for the uiautomator2 on-device server (u2.jar 0.4.1): the jar push, the app_process launch and
// readiness wait, JSON-RPC over HTTP through the adb server, and the restart when the server stops
// answering.

import {createHash} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {adb, AdbConnection, AdbError, ConnectionLost, deviceShell, shellQuote} from './adb.ts'
import {sleep, throwIfAborted, tracked} from './util.ts'

const JAR_URL = 'https://github.com/openatx/android-uiautomator-server-jar/releases/download/0.4.1/u2.jar'
const JAR_SHA256 = '87c8ac9505970d42aa5922baa90114808fda6f47f9e5fbd4caa0f621c2c8d30d'
const JAR_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.cache', 'u2.jar')
const DEVICE_JAR = '/data/local/tmp/u2.jar'
const SERVER_PORT = 9008
// The uiautomator2 client's default HTTP timeout for a JSON-RPC call.
const HTTP_TIMEOUT = 300
const SCROLL_STEPS = 55

export class HTTPError extends Error {
  override name = 'HTTPError'
}
export class RemoteDisconnected extends ConnectionLost {
  override name = 'RemoteDisconnected'
}
export class UiAutomationNotConnectedError extends Error {
  override name = 'UiAutomationNotConnectedError'
}
export class UiObjectNotFoundError extends Error {
  override name = 'UiObjectNotFoundError'
}
export class RPCError extends Error {
  override name = 'RPCError'
}
export class TapNotInjectedError extends Error {
  override name = 'TapNotInjectedError'
}
export class LaunchUiAutomationError extends Error {
  override name = 'LaunchUiAutomationError'
}

/** Download u2.jar into .cache unless it is already there, and check its hash. */
export async function ensureJar(): Promise<string> {
  if (existsSync(JAR_PATH) && sha256(readFileSync(JAR_PATH)) === JAR_SHA256) return JAR_PATH
  const response = await fetch(JAR_URL, {signal: AbortSignal.timeout(120_000)})
  if (!response.ok) throw new Error(`u2.jar download failed: ${response.status} ${response.statusText}`)
  const data = Buffer.from(await response.arrayBuffer())
  const hash = sha256(data)
  if (hash !== JAR_SHA256) throw new Error(`u2.jar sha256 ${hash}, expected ${JAR_SHA256}`)
  mkdirSync(dirname(JAR_PATH), {recursive: true})
  writeFileSync(JAR_PATH, data)
  return JAR_PATH
}

export type AppInfo = {package: string; activity: string; pid: number}
export type Bounds = {left: number; top: number; right: number; bottom: number}
export type ObjInfo = {bounds?: Bounds; visibleBounds?: Bounds; selected?: boolean; text?: string | null; [key: string]: unknown}

// UiSelector fields and their mask bits, as the server reads them.
const SELECTOR_FIELDS = {
  text: 0x01,
  textContains: 0x02,
  textMatches: 0x04,
  textStartsWith: 0x08,
  className: 0x10,
  classNameMatches: 0x20,
  description: 0x40,
  descriptionContains: 0x80,
  descriptionMatches: 0x0100,
  descriptionStartsWith: 0x0200,
  checkable: 0x0400,
  checked: 0x0800,
  clickable: 0x1000,
  longClickable: 0x2000,
  scrollable: 0x4000,
  enabled: 0x8000,
  focusable: 0x010000,
  focused: 0x020000,
  selected: 0x040000,
  packageName: 0x080000,
  packageNameMatches: 0x100000,
  resourceId: 0x200000,
  resourceIdMatches: 0x400000,
  index: 0x800000,
  instance: 0x01000000,
} as const

export type SelectorFields = Partial<Record<keyof typeof SELECTOR_FIELDS, string | number | boolean>>

export class Device {
  waitTimeout = 20
  // The server this Device launched, if any. Its shell connection closes when the process exits, which
  // ends the server.
  #server: ServerProcess | undefined

  private constructor() {}

  /**
   * Start the server unless one already answers. When the start fails or the attempt aborts, a server the
   * start already launched is stopped before the error propagates.
   */
  static async connect(): Promise<Device> {
    const device = new Device()
    try {
      await device.startServer()
      throwIfAborted()
    } catch (error) {
      device.#server?.kill()
      device.#server = undefined
      throw error
    }
    return device
  }

  async startServer(): Promise<void> {
    await tracked('uiautomator2 start', async () => {
      await setupJar()
      throwIfAborted()
      if (this.#server?.exited) this.#server = undefined
      if (await checkAlive()) return
      throwIfAborted()
      const connection = await AdbConnection.service(`shell:CLASSPATH=${DEVICE_JAR} app_process / com.wetest.uia2.Main -p ${SERVER_PORT}`, 600)
      const server = new ServerProcess(connection)
      this.#server = server
      throwIfAborted()
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        if (server.output.includes('already registered')) throw new LaunchUiAutomationError(`accessibility service already registered: ${server.output}`)
        if (server.exited) throw new LaunchUiAutomationError(`server quit unexpectedly: ${server.output}`)
        if (await checkAlive()) return
        await sleep(0.5)
      }
      throw new LaunchUiAutomationError(`server not ready: ${server.output}`)
    })
  }

  /** Stop the server this Device launched. A server it found running is left alone. */
  async close(): Promise<void> {
    if (this.#server) await this.stopServer()
  }

  async stopServer(): Promise<void> {
    this.#server?.kill()
    this.#server = undefined
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      if (!(await checkAlive())) return
      await sleep(0.5)
    }
  }

  /**
   * One JSON-RPC call. A dead server is restarted once and the call repeated. Positional arguments go as a
   * list and a call without any as an empty object.
   */
  rpc(method: string, params: unknown[] | Record<string, never> = {}, timeout = HTTP_TIMEOUT): Promise<unknown> {
    return tracked(`uiautomator2 ${method}`, async () => {
      try {
        return await jsonrpcOnce(method, params, timeout)
      } catch (error) {
        if (!(error instanceof HTTPError || error instanceof UiAutomationNotConnectedError)) throw error
        throwIfAborted()
        await this.stopServer()
        await this.startServer()
        throwIfAborted()
        return await jsonrpcOnce(method, params, timeout)
      }
    })
  }

  info(): Promise<Record<string, unknown>> {
    return this.rpc('deviceInfo', {}, 10) as Promise<Record<string, unknown>>
  }

  async dumpHierarchy(): Promise<string> {
    // The server sometimes returns an empty dump. Ask three times, a second apart, then return an empty
    // hierarchy.
    for (let attempt = 0; attempt < 3; attempt++) {
      const content = String((await this.rpc('dumpWindowHierarchy', [false, 50])) ?? '')
      if (content !== '' && !content.includes('<hierarchy rotation="0" />')) return content
      if (attempt < 2) await sleep(1)
    }
    return `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>\r\n<hierarchy rotation="0" />`
  }

  /**
   * Tap at `x`, `y`. The server answers whether the system accepted the injected release, which says
   * nothing about whether the app under it handled the tap. A rejected injection throws.
   */
  async click(x: number, y: number): Promise<void> {
    if ((await this.rpc('click', [x, y])) === false) throw new TapNotInjectedError(`tap at ${x},${y} was not injected`)
  }

  /** Swipe over `duration` seconds. uiautomator moves one step about every 5ms. */
  async swipe(fromX: number, fromY: number, toX: number, toY: number, duration: number): Promise<void> {
    await this.rpc('swipe', [fromX, fromY, toX, toY, Math.max(2, Math.trunc(duration * 200))])
  }

  /**
   * Save a screenshot as `<base>.jpg`, the JPEG at quality 80 the server returns. When the server has no
   * screenshot, fall back to screencap and `<base>.png`.
   */
  async screenshot(base: string): Promise<void> {
    const data = await this.rpc('takeScreenshot', [1, 80])
    throwIfAborted()
    if (typeof data === 'string' && data) {
      writeFileSync(`${base}.jpg`, Buffer.from(data, 'base64'))
      return
    }
    const png = await tracked('screencap', () => AdbConnection.service('exec:screencap -p', 60))
    try {
      writeFileSync(`${base}.png`, await png.readUntil(() => false))
    } finally {
      png.close()
    }
  }

  /** Screen size in pixels from `wm size`, swapped when the display is rotated. */
  async windowSize(): Promise<[number, number]> {
    const output = await deviceShell('wm size')
    const match = /Override size: (\d+)x(\d+)/.exec(output) ?? /Physical size: (\d+)x(\d+)/.exec(output)
    if (!match) throw new AdbError(`wm size output unexpected: ${output}`)
    const width = Number(match[1])
    const height = Number(match[2])
    let rotation: number | undefined
    for (const line of (await deviceShell('dumpsys display')).split('\n')) {
      const orientation = /.*?orientation=(\d+)/.exec(line)
      if (orientation) {
        rotation = Number(orientation[1])
        break
      }
    }
    if (rotation === undefined) throw new AdbError('rotation get failed')
    return rotation % 2 === 1 ? [height, width] : [width, height]
  }

  /** The focused app from the window, activity or top dump, three attempts half a second apart. */
  async appCurrent(): Promise<AppInfo> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.#appCurrentOnce()
      } catch (error) {
        if (!(error instanceof AdbError) || attempt >= 3) throw error
        await sleep(0.5 + Math.random() * 0.1)
      }
    }
  }

  async #appCurrentOnce(): Promise<AppInfo> {
    const focused = /mCurrentFocus=Window\{.*\s+([^\s]+)\/([^\s]+)\}/.exec(await deviceShell('dumpsys window windows'))
    if (focused) return {package: focused[1]!, activity: focused[2]!, pid: 0}
    const resumed = /mResumedActivity: ActivityRecord\{.*?\s+([^\s]+)\/([^\s]+)\s.*?\}/.exec(await deviceShell('dumpsys activity activities'))
    const resumedPackage = resumed?.[1]
    let last: AppInfo | undefined
    for (const activity of (await deviceShell('dumpsys activity top')).matchAll(/ACTIVITY ([^\s]+)\/([^/\s]+) \w+ pid=(\d+)/g)) {
      last = {package: activity[1]!, activity: activity[2]!, pid: Number(activity[3])}
      if (last.package === resumedPackage) return last
    }
    if (last) return last
    throw new AdbError("Couldn't get focused app")
  }

  find(fields: SelectorFields): UiObject {
    return new UiObject(this, selector(fields))
  }
}

export class UiObject {
  readonly device: Device
  readonly selector: Record<string, unknown>

  constructor(device: Device, selector: Record<string, unknown>) {
    this.device = device
    this.selector = selector
  }

  async exists(): Promise<boolean> {
    return Boolean(await this.device.rpc('exist', [this.selector]))
  }

  async wait(timeout = this.device.waitTimeout): Promise<boolean> {
    try {
      return Boolean(await this.device.rpc('waitForExists', [this.selector, Math.trunc(timeout * 1000)], timeout + 10))
    } catch (error) {
      // A wait that fails over HTTP falls back to a plain existence check.
      if (!(error instanceof HTTPError)) throw error
      return this.exists()
    }
  }

  async mustWait(timeout?: number): Promise<void> {
    if (!(await this.wait(timeout))) throw new UiObjectNotFoundError(`-32002 ${JSON.stringify(this.selector)} wait`)
  }

  async info(): Promise<ObjInfo> {
    return (await this.device.rpc('objInfo', [this.selector])) as ObjInfo
  }

  async click(timeout?: number): Promise<void> {
    await this.mustWait(timeout)
    const info = await this.info()
    const bounds = info.visibleBounds ?? info.bounds
    if (!bounds) throw new RPCError(`no bounds for ${JSON.stringify(this.selector)}`)
    await this.device.click(bounds.left + (bounds.right - bounds.left) * 0.5, bounds.top + (bounds.bottom - bounds.top) * 0.5)
  }

  async getText(timeout?: number): Promise<string | null> {
    await this.mustWait(timeout)
    return (await this.device.rpc('getText', [this.selector])) as string | null
  }

  async scrollForward(steps = SCROLL_STEPS): Promise<boolean> {
    return Boolean(await this.device.rpc('scrollForward', [this.selector, true, steps]))
  }
}

function selector(fields: SelectorFields): Record<string, unknown> {
  let mask = 0
  for (const key of Object.keys(fields) as Array<keyof typeof SELECTOR_FIELDS>) mask |= SELECTOR_FIELDS[key]
  return {mask, childOrSibling: [], childOrSiblingSelector: [], ...fields}
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

// NanoHTTPD reads a body without a charset as US-ASCII, so every non-ASCII character goes out escaped.
// Raw UTF-8 would garble patterns like 日本語.
function asciiJson(value: unknown): string {
  return JSON.stringify(value).replace(/[\u0080-￿]/g, (character) => '\\u' + character.charCodeAt(0).toString(16).padStart(4, '0'))
}

/** Index of the end of a complete HTTP response in `data`, or -1 while it is incomplete. */
function responseEnd(data: Buffer): number {
  const headerEnd = data.indexOf('\r\n\r\n')
  if (headerEnd < 0) return -1
  const head = data.subarray(0, headerEnd).toString('latin1')
  const bodyStart = headerEnd + 4
  const length = /^content-length:\s*(\d+)/im.exec(head)
  if (length) return data.length >= bodyStart + Number(length[1]) ? bodyStart + Number(length[1]) : -1
  if (/^transfer-encoding:\s*chunked/im.test(head)) {
    let at = bodyStart
    for (;;) {
      const lineEnd = data.indexOf('\r\n', at)
      if (lineEnd < 0) return -1
      const size = parseInt(data.subarray(at, lineEnd).toString('latin1'), 16)
      if (size === 0) {
        const end = data.indexOf('\r\n', lineEnd + 2)
        return end < 0 ? -1 : end + 2
      }
      at = lineEnd + 2 + size + 2
      if (at > data.length) return -1
    }
  }
  return -1
}

function parseResponse(raw: Buffer): {status: number; reason: string; body: Buffer} {
  const headerEnd = raw.indexOf('\r\n\r\n')
  const head = raw.subarray(0, headerEnd).toString('latin1')
  const statusLine = /^HTTP\/\d\.\d (\d+) ?(.*)/.exec(head)
  if (!statusLine) throw new HTTPError(`malformed HTTP response: ${JSON.stringify(head.slice(0, 80))}`)
  let body = raw.subarray(headerEnd + 4)
  if (/^transfer-encoding:\s*chunked/im.test(head)) {
    const parts: Buffer[] = []
    let at = 0
    for (;;) {
      const lineEnd = body.indexOf('\r\n', at)
      const size = parseInt(body.subarray(at, lineEnd).toString('latin1'), 16)
      if (!size) break
      parts.push(body.subarray(lineEnd + 2, lineEnd + 2 + size))
      at = lineEnd + 2 + size + 2
    }
    body = Buffer.concat(parts)
  } else {
    const length = /^content-length:\s*(\d+)/im.exec(head)
    if (length) body = body.subarray(0, Number(length[1]))
  }
  return {status: Number(statusLine[1]), reason: statusLine[2] ?? '', body}
}

/** One HTTP request to the on-device server through the adb server, on a fresh connection. */
async function httpRequest(method: string, path: string, data: unknown, timeout: number): Promise<Buffer> {
  let connection: AdbConnection
  try {
    connection = await AdbConnection.service(`tcp:${SERVER_PORT}`, timeout)
  } catch (error) {
    if (error instanceof AdbError) throw new HTTPError(`Unable to connect to uiautomator2 server: ${error.message}`, {cause: error})
    throw error
  }
  try {
    const body = data === undefined ? '' : asciiJson(data)
    const headers = [
      `${method} ${path} HTTP/1.1`,
      `Host: localhost:${SERVER_PORT}`,
      'User-Agent: uiautomator2',
      'Accept-Encoding: ',
      'Content-Type: application/json',
    ]
    if (body) headers.push(`Content-Length: ${Buffer.byteLength(body)}`)
    throwIfAborted()
    connection.socket.write(headers.join('\r\n') + '\r\n\r\n' + body)
    const raw = await connection.readUntil((buffer) => responseEnd(buffer) >= 0)
    let end = responseEnd(raw)
    if (end < 0) {
      if (raw.length === 0) throw new RemoteDisconnected('Remote end closed connection without response')
      const headerEnd = raw.indexOf('\r\n\r\n')
      const head = raw.subarray(0, Math.max(headerEnd, 0)).toString('latin1')
      // A response without a length or chunking ends when the server closes the connection.
      if (headerEnd < 0 || /^(content-length|transfer-encoding):/im.test(head)) throw new RemoteDisconnected('connection closed mid-response')
      end = raw.length
    }
    const response = parseResponse(raw.subarray(0, end))
    if (response.status !== 200) throw new HTTPError(`HTTP request failed: ${response.status} ${response.reason}`)
    return response.body
  } finally {
    connection.close()
  }
}

async function jsonrpcOnce(method: string, params: unknown, timeout: number): Promise<unknown> {
  const payload = {jsonrpc: '2.0', id: 1, method, params}
  const text = (await httpRequest('POST', '/jsonrpc/0', payload, timeout)).toString('utf8')
  const data: unknown = JSON.parse(text)
  if (typeof data !== 'object' || data === null) throw new RPCError('Unknown RPC error: not a dict')
  if ('error' in data) {
    const error = (data.error ?? {}) as {code?: unknown; message?: unknown}
    const message = String(error.message ?? '')
    if (text.includes('UiAutomation not connected')) throw new UiAutomationNotConnectedError('UiAutomation not connected')
    if (message.includes('android.os.DeadObjectException')) throw new UiAutomationNotConnectedError('android.os.DeadObjectException')
    if (message.includes('android.os.DeadSystemRuntimeException')) throw new UiAutomationNotConnectedError('android.os.DeadSystemRuntimeException')
    if (message.includes('uiautomator.UiObjectNotFoundException')) throw new UiObjectNotFoundError(`${String(error.code)} ${message}`)
    throw new RPCError(`Unknown RPC error: ${String(error.code)} ${message}`)
  }
  if (!('result' in data)) throw new RPCError('Unknown RPC error: no result field')
  return data.result
}

class ServerProcess {
  readonly connection: AdbConnection
  output = ''

  constructor(connection: AdbConnection) {
    this.connection = connection
    // The server lives as long as this shell. Do not let it hold the Node process open.
    connection.socket.unref()
    connection.socket.setTimeout(0)
    connection.stream((chunk) => {
      this.output += chunk.toString('utf8')
    })
  }

  get exited(): boolean {
    return this.connection.closed
  }

  kill(): void {
    this.connection.close()
  }
}

async function checkAlive(): Promise<boolean> {
  try {
    return (await httpRequest('GET', '/ping', undefined, 10)).toString() === 'pong'
  } catch (error) {
    if (error instanceof HTTPError || error instanceof ConnectionLost) return false
    throw error
  }
}

async function setupJar(): Promise<void> {
  const local = await ensureJar()
  const md5 = createHash('md5').update(readFileSync(local)).digest('hex')
  let output = await deviceShell(shellQuote(['toybox', 'md5sum', DEVICE_JAR]))
  throwIfAborted()
  if (output.includes('toybox') && output.includes('not found')) output = await deviceShell(shellQuote(['md5', DEVICE_JAR]))
  throwIfAborted()
  if (!output.includes(md5)) await adb(['push', local, DEVICE_JAR], 120)
}
