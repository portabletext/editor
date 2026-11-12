// adb through the CLI for the driver's own calls, and through the adb server's socket protocol for the
// uiautomator2 connections (device shell and device TCP ports).

import {AsyncLocalStorage} from 'node:async_hooks'
import {spawn} from 'node:child_process'
import net from 'node:net'
import {KILL_GRACE_SECONDS} from './budget.ts'
import {
  currentInspection,
  currentSignal,
  isInstance,
  throwIfAborted,
  tracked,
  UNPRINTABLE_ERROR,
  type Inspection,
} from './util.ts'

const DEVICE_OFFLINE = 'device offline'
const NO_DEVICES = 'no devices/emulators found'

export class CommandError extends Error {
  override name = 'CommandError'
  /** Whether the command ran past its timeout, which a device adb lost and a slow one both cause. */
  timedOut = false
}

/**
 * A process that outlived SIGTERM and SIGKILL. It may still be talking to the device, so the attempt it
 * belongs to must not be retried.
 */
export class ProcessNotStoppedError extends Error {
  override name = 'ProcessNotStoppedError'
}

const unstopped: string[] = []

/** Processes that outlived SIGKILL since the driver loaded. */
export function unstoppedProcesses(): readonly string[] {
  return unstopped
}

/** Throw once any process has outlived SIGKILL. No attempt or call starts and no run completes after one, though bounded failure cleanup still runs. */
export function assertNoUnstoppedProcess(): void {
  if (unstopped.length > 0) {
    throw new ProcessNotStoppedError(
      `not starting device work while ${unstopped.join(', ')} may still run`,
    )
  }
}

/** Run adb and return stdout. Rejects on a non-zero exit or after `timeout` seconds. */
export function adb(args: string[], timeout = 30): Promise<string> {
  return tracked(`adb ${args.join(' ')}`, () => run('adb', args, timeout))
}

/** Run adb and return stdout whatever its exit code. Still rejects on a timeout. */
export function adbOutput(args: string[], timeout = 60): Promise<string> {
  return tracked(`adb ${args.join(' ')}`, () =>
    run('adb', args, timeout, false),
  )
}

/** Run adb and return its exit code, stdout and stderr apart. Still rejects on a timeout. */
export function adbExit(
  args: string[],
  timeout: number,
): Promise<{code: number | null; stdout: string; stderr: string}> {
  return tracked(`adb ${args.join(' ')}`, () =>
    runChild('adb', args, timeout, 'pipe'),
  )
}

/** Run adb with its output on our stdout. A non-zero exit is ignored, a timeout still throws. */
export async function adbPassthrough(
  args: string[],
  timeout = 60,
): Promise<void> {
  await tracked(`adb ${args.join(' ')}`, () =>
    runChild('adb', args, timeout, 'inherit'),
  )
}

/**
 * Run `file` and return stdout. A timeout or an abort of the current attempt stops the process, and the
 * promise settles only once it has exited.
 */
export async function run(
  file: string,
  args: string[],
  timeout: number,
  check = true,
): Promise<string> {
  const {code, stdout, stderr} = await runChild(file, args, timeout, 'pipe')
  if (check && code !== 0) {
    throw new CommandError(
      `${file} ${args.join(' ')} exited with ${code}: ${stderr.trim()}`,
    )
  }
  return stdout
}

/**
 * Spawn `file` and wait for it to exit. On a timeout or an abort it sends SIGTERM, then SIGKILL after
 * `KILL_GRACE_SECONDS`, and rejects once the process has exited. A process still running another
 * `KILL_GRACE_SECONDS` after SIGKILL rejects with `ProcessNotStoppedError`.
 */
function runChild(
  file: string,
  args: string[],
  timeout: number,
  output: 'pipe' | 'inherit',
): Promise<{code: number | null; stdout: string; stderr: string}> {
  const signal = currentSignal()
  signal?.throwIfAborted()
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {stdio: ['ignore', output, output]})
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk))
    let stopReason: unknown
    const timers: NodeJS.Timeout[] = []
    const stop = (reason: unknown) => {
      if (stopReason !== undefined) {
        return
      }
      stopReason = reason
      child.kill('SIGTERM')
      timers.push(
        setTimeout(() => {
          child.kill('SIGKILL')
          timers.push(
            setTimeout(() => {
              finish()
              unstopped.push(`${file} ${args.join(' ')} (pid ${child.pid})`)
              reject(
                new ProcessNotStoppedError(
                  `${file} ${args.join(' ')} (pid ${child.pid}) still runs after SIGKILL`,
                  {cause: reason},
                ),
              )
            }, KILL_GRACE_SECONDS * 1000),
          )
        }, KILL_GRACE_SECONDS * 1000),
      )
    }
    const onAbort = () => stop(signal!.reason)
    const finish = () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
      signal?.removeEventListener('abort', onAbort)
    }
    timers.push(
      setTimeout(() => {
        const error = new CommandError(
          `${file} ${args.join(' ')} timed out after ${timeout}s`,
        )
        error.timedOut = true
        stop(error)
      }, timeout * 1000),
    )
    signal?.addEventListener('abort', onAbort, {once: true})
    child.on('error', (error) => {
      finish()
      reject(stopReason ?? error)
    })
    child.on('close', (code) => {
      finish()
      if (stopReason !== undefined) {
        reject(stopReason)
      } else {
        resolve({
          code,
          stdout: Buffer.concat(stdout).toString('utf8'),
          stderr: Buffer.concat(stderr).toString('utf8'),
        })
      }
    })
  })
}

export class AdbError extends Error {
  override name = 'AdbError'
  /** Whether the adb server answered the request with `FAIL`, so the message is the server's own. */
  serverFailed = false
}

/** The peer reset or dropped the connection. */
export class ConnectionLost extends Error {
  override name = 'ConnectionLost'
}

export class SocketTimeout extends Error {
  override name = 'SocketTimeout'
}

/** A socket to the adb server with buffered reads. */
export class AdbConnection {
  readonly socket: net.Socket
  #buffer = Buffer.alloc(0)
  #closed = false
  #error: Error | undefined
  #wake: (() => void) | undefined
  #onData: ((chunk: Buffer) => void) | undefined

  private constructor(
    socket: net.Socket,
    signal: AbortSignal | undefined,
    inspection: Inspection,
  ) {
    this.socket = socket
    // An abort of the attempt that opened the connection destroys it, so a read the attempt is blocked on
    // rejects with the abort reason and a server it launched over this shell ends.
    if (signal) {
      const onAbort = () => {
        // The listener runs in the context of whoever aborted, so it reads the reason through the
        // inspection of the call that opened the connection.
        // A plain inspection runs only its callback. The fallback is built only after a guarded inspection
        // threw, and it reads the reason through its own guard.
        const read = inspection.guard<{error: Error} | undefined>(
          () => ({
            error:
              signal.reason instanceof Error
                ? signal.reason
                : new Error(String(signal.reason)),
          }),
          undefined,
        )
        this.#error = read
          ? read.error
          : new Error(
              UNPRINTABLE_ERROR,
              inspection.guard(() => ({cause: signal.reason}), undefined),
            )
        socket.destroy()
      }
      signal.addEventListener('abort', onAbort, {once: true})
      socket.once('close', () => signal.removeEventListener('abort', onAbort))
    }
    socket.on('data', (chunk: Buffer) => {
      if (this.#onData) {
        this.#onData(chunk)
      } else {
        this.#buffer = Buffer.concat([this.#buffer, chunk])
      }
      this.#notify()
    })
    socket.on('end', () => {
      this.#closed = true
      this.#notify()
    })
    socket.on('close', () => {
      this.#closed = true
      this.#notify()
    })
    socket.on('error', (error) => {
      this.#error ??= new ConnectionLost(error.message, {cause: error})
      this.#closed = true
      this.#notify()
    })
    socket.on('timeout', () => {
      this.#error ??= new SocketTimeout('socket timeout')
      socket.destroy()
    })
  }

  static open(timeout: number): Promise<AdbConnection> {
    const host = process.env.ANDROID_ADB_SERVER_HOST ?? '127.0.0.1'
    const port = Number(process.env.ANDROID_ADB_SERVER_PORT ?? 5037)
    const signal = currentSignal()
    const inspection = currentInspection()
    signal?.throwIfAborted()
    return new Promise((resolve, reject) => {
      const socket = net.connect({host, port})
      const onAbort = () => {
        socket.destroy()
        reject(signal!.reason)
      }
      signal?.addEventListener('abort', onAbort, {once: true})
      socket.setTimeout(timeout * 1000)
      socket.once('connect', () => {
        signal?.removeEventListener('abort', onAbort)
        resolve(new AdbConnection(socket, signal, inspection))
      })
      socket.once('error', (error) =>
        reject(
          new AdbError(`cannot reach the adb server: ${error.message}`, {
            cause: error,
          }),
        ),
      )
      socket.once('timeout', () => {
        socket.destroy()
        reject(new AdbError('timeout connecting to the adb server'))
      })
    })
  }

  /** Connect to the device's adbd and open `service` on it, e.g. "shell:ls" or "tcp:9008". */
  static async service(
    service: string,
    timeout: number,
  ): Promise<AdbConnection> {
    const connection = await AdbConnection.open(timeout)
    try {
      const serial = process.env.ANDROID_SERIAL
      await connection.command(
        serial ? `host:transport:${serial}` : 'host:transport-any',
      )
      throwIfAborted()
      await connection.command(service)
      return connection
    } catch (error) {
      connection.close()
      throw error
    }
  }

  #notify(): void {
    const wake = this.#wake
    this.#wake = undefined
    wake?.()
  }

  #waitForData(): Promise<void> {
    return new Promise((resolve) => {
      this.#wake = resolve
    })
  }

  async command(request: string): Promise<void> {
    const body = Buffer.from(request, 'utf8')
    this.socket.write(
      Buffer.concat([
        Buffer.from(body.length.toString(16).padStart(4, '0')),
        body,
      ]),
    )
    const status = (await this.readExact(4)).toString()
    if (status === 'OKAY') {
      return
    }
    if (status === 'FAIL') {
      const length = parseInt((await this.readExact(4)).toString(), 16)
      const error = new AdbError((await this.readExact(length)).toString())
      error.serverFailed = true
      throw error
    }
    throw new AdbError(`unknown data: ${JSON.stringify(status)}`)
  }

  async readExact(length: number): Promise<Buffer> {
    while (this.#buffer.length < length) {
      if (this.#closed) {
        if (this.#error) {
          throw this.#error
        }
        throw new AdbError('connection closed')
      }
      await this.#waitForData()
    }
    const head = this.#buffer.subarray(0, length)
    this.#buffer = this.#buffer.subarray(length)
    return head
  }

  /** Read what has arrived so far, waiting for more until `done` says the bytes are complete or the peer closes. */
  async readUntil(done: (data: Buffer) => boolean): Promise<Buffer> {
    while (!done(this.#buffer)) {
      if (this.#closed) {
        if (this.#error) {
          throw this.#error
        }
        break
      }
      await this.#waitForData()
    }
    return this.#buffer
  }

  /** Hand every later chunk to `onData` instead of buffering it. */
  stream(onData: (chunk: Buffer) => void): void {
    if (this.#buffer.length) {
      onData(this.#buffer)
    }
    this.#buffer = Buffer.alloc(0)
    this.#onData = onData
  }

  get closed(): boolean {
    return this.#closed
  }

  close(): void {
    this.socket.destroy()
  }
}

/** Run a shell command on the device over the socket protocol and return its output. */
export function deviceShell(command: string, timeout = 600): Promise<string> {
  return tracked(`shell ${command}`, async () => {
    const connection = await AdbConnection.service(`shell:${command}`, timeout)
    try {
      return (await connection.readUntil(() => false))
        .toString('utf8')
        .trimEnd()
    } finally {
      connection.close()
    }
  })
}

/** Quote arguments for the device shell. */
export function shellQuote(args: string[]): string {
  return args
    .map((argument) =>
      /^[\w@%+=:,./-]+$/.test(argument)
        ? argument
        : `'${argument.replaceAll("'", `'"'"'`)}'`,
    )
    .join(' ')
}

// Whether the current code belongs to a `runOnDevice` call, set by `runStrict`.
const strictCall = new AsyncLocalStorage<true>()

/** Run `run` as part of a `runOnDevice` call, whose device helpers never swallow adb's own lost-device error. */
export function runStrict<T>(run: () => T): T {
  return strictCall.run(true, run)
}

/**
 * Run `run` outside any `runOnDevice` call's strict scope, as a driver call does when it starts: strict
 * scope belongs to the call that enters it, not to whatever code queued the next call.
 */
export function runNotStrict<T>(run: () => T): T {
  return strictCall.exit(run)
}

/**
 * adb's own error for a lost device, as a `runOnDevice` call recognised it: `adbError` quotes it, read once
 * when it was recognised, and `cause` is the value that was thrown. Every decision after that reads
 * `adbError` and never the thrown value again. `runOnDevice` rejects with `cause`, never with this.
 */
export class DeviceLost extends Error {
  override name = 'DeviceLost'
  readonly adbError: string
  constructor(adbError: string, cause: unknown) {
    super(adbError, {cause})
    this.adbError = adbError
  }
}

/**
 * In a `runOnDevice` call, throw `DeviceLost` when `error` is adb's own error for a lost device, and pass
 * on a `DeviceLost` as it is, never classified again. A helper that logs a failure and goes on calls it
 * first, so a `runOnDevice` call ends `device-offline` on that error instead of on whatever the helper
 * tries next. `typeOnDevice` keeps going, and never sees a `DeviceLost`.
 */
export function throwIfStrictLoss(error: unknown): void {
  if (strictCall.getStore() === undefined) {
    return
  }
  if (isInstance(error, DeviceLost)) {
    throw error
  }
  const lost = adbLostDevice(error)
  if (lost !== undefined && lost !== 'timeout') {
    throw new DeviceLost(lost.adbError, error)
  }
}

/**
 * The value a `runOnDevice` call threw before it recognised `error` as `DeviceLost`, or `error` itself. It
 * never throws, since it also runs once the call's own inspection ended, on any value a step threw.
 */
export function thrownValue(error: unknown): unknown {
  try {
    return error instanceof DeviceLost ? error.cause : error
  } catch {
    return error
  }
}

/**
 * How an adb call failed when adb may have lost the device: on adb's own error for a device that went
 * offline, a connection it lost or no device at all, `adbError` quoting it, or on a timeout, which a device
 * that still answers can cause too.
 */
export type AdbLoss = {adbError: string} | 'timeout'

/**
 * How `error` failed when adb may have lost the device, `undefined` for any other failure. adb's own error
 * comes from either of its transports: the CLI prints it on stderr, which `CommandError` carries in its
 * message and never mixes with stdout, and the adb server answers a socket request with `FAIL` and the
 * message, an `AdbError` the uiautomator2 client can wrap as its error's `cause`. A socket that closed or a
 * request that timed out says nothing of the device, so neither counts.
 */
export function adbLostDevice(error: unknown): AdbLoss | undefined {
  const {guard} = currentInspection()
  if (isInstance(error, CommandError)) {
    if (guard(() => error.timedOut === true, false)) {
      return 'timeout'
    }
    // Read once, so the message quoted is the one classified.
    const message = guard(() => String(error.message), undefined)
    return message !== undefined && lostDeviceMessage(message)
      ? {adbError: message}
      : undefined
  }
  const answered = [
    error,
    guard(() => (error instanceof Error ? error.cause : undefined), undefined),
  ].find((candidate) => isInstance(candidate, AdbError))
  if (
    !isInstance(answered, AdbError) ||
    !guard(() => answered.serverFailed === true, false)
  ) {
    return undefined
  }
  const message = guard(() => String(answered.message), undefined)
  return message !== undefined && lostDeviceMessage(message)
    ? {adbError: `the adb server answered FAIL: ${message}`}
    : undefined
}

/**
 * What one `adb get-state` proves about the device, or `undefined` when it proves nothing. Only `device` on
 * stdout is reachable. Only an offline device, as `offline` on stdout or adb's `device offline` error, the
 * answer of a dead emulator, or adb finding no such device is lost. Its stderr also carries daemon start-up
 * lines. A device that is `unauthorized`, in `bootloader` or `recovery`, or in any other state is still
 * there, and an adb that never answered may only be slow, so neither is lost: a retry on a reachable device
 * could turn a real test failure into a passing retry.
 */
export function deviceVerdict(adb: {
  stdout: string
  stderr: string
  timedOut: boolean
}): 'device' | 'lost' | undefined {
  if (adb.timedOut) {
    return undefined
  }
  const state = adb.stdout.trim()
  if (state === 'device') {
    return 'device'
  }
  if (state === 'offline') {
    return 'lost'
  }
  if (
    state === '' &&
    new RegExp(
      `^error: (${DEVICE_OFFLINE}|${NO_DEVICES}|device '[^']*' not found)$`,
      'm',
    ).test(adb.stderr)
  ) {
    return 'lost'
  }
  return undefined
}

function lostDeviceMessage(message: string): boolean {
  return new RegExp(`${DEVICE_OFFLINE}|error: closed|${NO_DEVICES}`).test(
    message,
  )
}
