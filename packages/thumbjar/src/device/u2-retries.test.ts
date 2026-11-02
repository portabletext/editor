import {beforeEach, describe, expect, test, vi} from 'vitest'
import {AdbError, DeviceLost, runStrict} from './adb.ts'
import {Device, HTTPError, UiObject} from './u2.ts'
import {GUARDED_INSPECTION, runInspecting} from './util.ts'

const SOCKET_LOSS = 'the adb server answered FAIL: device offline'

const JAR_MD5 =
  '87c8ac9505970d42aa5922baa90114808fda6f47f9e5fbd4caa0f621c2c8d30d'

const server = vi.hoisted(() => ({
  /** Each request in order: `GET /ping`, a JSON-RPC method, `shell <command>` or `launch`. */
  requests: [] as string[],
  /** What the next requests for a JSON-RPC method fail with, once per entry. */
  rpcErrors: {} as Record<string, unknown[]>,
  /** What the next pings fail with, once per entry, before they answer `pong` or `no`. */
  pingErrors: [] as unknown[],
  /** Whether the server answers its ping with `pong`. */
  alive: true,
  /** What the next `dumpsys` shells fail with, once per entry. */
  shellErrors: [] as unknown[],
}))

vi.mock(import('node:fs'), async (importOriginal) => ({
  ...(await importOriginal()),
  existsSync: () => true,
  readFileSync: (() => Buffer.from('jar')) as never,
}))

vi.mock(import('node:crypto'), async (importOriginal) => ({
  ...(await importOriginal()),
  createHash: (() => ({
    update() {
      return this
    },
    digest: () => JAR_MD5,
  })) as never,
}))

vi.mock(import('./adb.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  adb: () => Promise.resolve(''),
  // `deviceShell` reaches the adb server inside `adb.ts`, past the `AdbConnection` below.
  deviceShell: (command: string) => {
    if (command.includes('md5sum')) {
      return Promise.resolve(JAR_MD5)
    }
    server.requests.push(`shell ${command}`)
    const error = server.shellErrors.shift()
    if (error !== undefined) {
      return Promise.reject(error)
    }
    return Promise.resolve(
      command === 'dumpsys window windows'
        ? 'mCurrentFocus=Window{1 u0 com.android.chrome/Main}'
        : '',
    )
  },
  AdbConnection: {
    service: (service: string) => {
      if (service.startsWith('shell:CLASSPATH=')) {
        server.requests.push('launch')
        server.alive = true
        return Promise.resolve(connection(() => ''))
      }
      let request = ''
      return Promise.resolve({
        ...connection(() => ''),
        socket: {
          write(data: string) {
            request = data
          },
          unref() {},
          setTimeout() {},
        },
        readUntil: () => {
          if (request.startsWith('GET /ping')) {
            server.requests.push('GET /ping')
            const error = server.pingErrors.shift()
            if (error !== undefined) {
              return Promise.reject(error)
            }
            return Promise.resolve(response(server.alive ? 'pong' : 'no'))
          }
          const method = (
            JSON.parse(request.slice(request.indexOf('\r\n\r\n') + 4)) as {
              method: string
            }
          ).method
          server.requests.push(method)
          const error = server.rpcErrors[method]?.shift()
          if (error !== undefined) {
            // A request that failed this way left the server dead until it is launched again.
            server.alive = false
            return Promise.reject(error)
          }
          return Promise.resolve(
            response(JSON.stringify({jsonrpc: '2.0', id: 1, result: true})),
          )
        },
      })
    },
  } as never,
}))

beforeEach(() => {
  vi.useFakeTimers()
  server.requests = []
  server.rpcErrors = {}
  server.pingErrors = []
  server.alive = true
  server.shellErrors = []
})

describe(Device.prototype.rpc.name, () => {
  test("under `runOnDevice`, the adb server's `FAIL` for a lost device ends the call with it, restarting no server", async () => {
    const fault = lostDevice()
    const device = await Device.connect()
    server.requests = []
    server.rpcErrors = {deviceInfo: [fault]}

    const error = await strict(() => device.info())

    expect({
      error,
      cause: (error as Error).cause,
      requests: server.requests,
    }).toEqual({
      error: new DeviceLost(SOCKET_LOSS, fault),
      cause: fault,
      requests: ['deviceInfo'],
    })
  })

  test('a connection that drops restarts the server and repeats the call', async () => {
    const device = await Device.connect()
    server.requests = []
    server.rpcErrors = {
      deviceInfo: [new HTTPError('Unable to connect to uiautomator2 server')],
    }

    const info = strict(() => device.info())
    await vi.runAllTimersAsync()

    expect({info: await info, requests: server.requests}).toEqual({
      info: true,
      requests: [
        'deviceInfo',
        'GET /ping',
        'GET /ping',
        'launch',
        'GET /ping',
        'deviceInfo',
      ],
    })
  })
})

describe(Device.prototype.appCurrent.name, () => {
  test("under `runOnDevice`, the adb server's `FAIL` for a lost device ends the read with it, reading no more", async () => {
    const fault = new AdbError('device offline')
    fault.serverFailed = true
    const device = await Device.connect()
    server.shellErrors = [fault]

    const reading = strict(() => device.appCurrent())
    await vi.runAllTimersAsync()

    const error = await reading

    expect({
      error,
      cause: (error as Error).cause,
      requests: server.requests,
    }).toEqual({
      error: new DeviceLost(SOCKET_LOSS, fault),
      cause: fault,
      requests: ['GET /ping', 'shell dumpsys window windows'],
    })
  })

  test('an ordinary adb error is read again, and the second read answers', async () => {
    const device = await Device.connect()
    server.shellErrors = [new AdbError('closed')]

    const reading = strict(() => device.appCurrent())
    await vi.runAllTimersAsync()

    expect({app: await reading, requests: server.requests}).toEqual({
      app: {package: 'com.android.chrome', activity: 'Main', pid: 0},
      requests: [
        'GET /ping',
        'shell dumpsys window windows',
        'shell dumpsys window windows',
      ],
    })
  })
})

describe(UiObject.prototype.wait.name, () => {
  test("under `runOnDevice`, the adb server's `FAIL` for a lost device ends the wait with it, checking no existence", async () => {
    const fault = lostDevice()
    const device = await Device.connect()
    server.requests = []
    server.rpcErrors = {waitForExists: [fault]}

    const error = await strict(() => device.find({text: 'foo'}).wait(1))

    expect({
      error,
      cause: (error as Error).cause,
      requests: server.requests,
    }).toEqual({
      error: new DeviceLost(SOCKET_LOSS, fault),
      cause: fault,
      requests: ['waitForExists'],
    })
  })

  test("under `runOnDevice`, the adb server's `FAIL` for a lost device on the repeated call ends the wait with it, checking no existence", async () => {
    const fault = lostDevice()
    const device = await Device.connect()
    server.requests = []
    // `rpc` repeats a call that failed over HTTP outside its own check, so the wait's check meets this loss.
    server.rpcErrors = {
      waitForExists: [
        new HTTPError('HTTP request failed: 500 Server Error'),
        fault,
      ],
    }

    const waiting = strict(() => device.find({text: 'foo'}).wait(1))
    await vi.runAllTimersAsync()
    const error = await waiting

    expect({
      error,
      cause: (error as Error).cause,
      requests: server.requests,
    }).toEqual({
      error: new DeviceLost(SOCKET_LOSS, fault),
      cause: fault,
      requests: [
        'waitForExists',
        'GET /ping',
        'GET /ping',
        'launch',
        'GET /ping',
        'waitForExists',
      ],
    })
  })

  test('a wait that fails over HTTP falls back to an existence check', async () => {
    const device = await Device.connect()
    server.requests = []
    // `rpc` repeats a call that failed over HTTP once, so the wait falls back only when both fail.
    server.rpcErrors = {
      waitForExists: [
        new HTTPError('HTTP request failed: 500 Server Error'),
        new HTTPError('HTTP request failed: 500 Server Error'),
      ],
    }

    const waiting = strict(() => device.find({text: 'foo'}).wait(1))
    await vi.runAllTimersAsync()

    expect({found: await waiting, requests: server.requests}).toEqual({
      found: true,
      requests: [
        'waitForExists',
        'GET /ping',
        'GET /ping',
        'launch',
        'GET /ping',
        'waitForExists',
        'exist',
      ],
    })
  })
})

describe(Device.prototype.stopServer.name, () => {
  test("under `runOnDevice`, the adb server's `FAIL` for a lost device on the ping ends the stop with it, pinging no more", async () => {
    const fault = lostDevice()
    server.alive = false
    const device = await Device.connect()
    server.requests = []
    server.pingErrors = [fault]

    const error = await strict(() => device.close())

    expect({
      error,
      cause: (error as Error).cause,
      requests: server.requests,
    }).toEqual({
      error: new DeviceLost(SOCKET_LOSS, fault),
      cause: fault,
      requests: ['GET /ping'],
    })
  })

  test('a ping whose connection drops reads as a stopped server', async () => {
    server.alive = false
    const device = await Device.connect()
    server.requests = []
    server.pingErrors = [
      new HTTPError('Unable to connect to uiautomator2 server'),
    ]

    const stopping = strict(() => device.close())
    await vi.runAllTimersAsync()

    expect({stopped: await stopping, requests: server.requests}).toEqual({
      stopped: undefined,
      requests: ['GET /ping'],
    })
  })
})

/** The `HTTPError` the uiautomator2 client throws when the adb server answers its connection with `FAIL device offline`. */
function lostDevice(): HTTPError {
  const answer = new AdbError('device offline')
  answer.serverFailed = true
  return new HTTPError(
    'Unable to connect to uiautomator2 server: device offline',
    {cause: answer},
  )
}

/** Run `run` as `runOnDevice` does, resolving to what it returns or rejects with. */
function strict<T>(run: () => Promise<T>): Promise<unknown> {
  return runStrict(() => runInspecting(GUARDED_INSPECTION, run)).catch(
    (error: unknown) => error,
  )
}

function connection(answer: () => string) {
  return {
    socket: {write() {}, unref() {}, setTimeout() {}},
    stream() {},
    close() {},
    closed: false,
    readUntil: () => Promise.resolve(Buffer.from(answer())),
  }
}

function response(body: string): Buffer {
  return Buffer.from(
    `HTTP/1.1 200 OK\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
  )
}
