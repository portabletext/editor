import {ChildProcess} from 'node:child_process'
import * as childProcesses from 'node:child_process'
import {EventEmitter} from 'node:events'
import {mkdtempSync, rmSync} from 'node:fs'
import net from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {
  AdbConnection,
  adbLostDevice,
  CommandError,
  deviceVerdict,
  run,
} from './adb.ts'
import {KILL_GRACE_SECONDS} from './budget.ts'
import {
  GUARDED_INSPECTION,
  runAbortable,
  runInspecting,
  UNPRINTABLE_ERROR,
} from './util.ts'

vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
}))

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'android-ime-adb-'))
})

afterEach(() => {
  rmSync(directory, {recursive: true, force: true})
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe(run.name, () => {
  test('an aborted run settles only after a process that ignores SIGTERM has exited', async () => {
    const ready = join(directory, 'ready')
    const child = controlledChild()
    const controller = new AbortController()
    const running = runAbortable(controller.signal, () =>
      run(process.execPath, ['-e', ignoreSigterm(ready)], 60),
    ).catch((error: Error) => error.message)
    await child.spawned
    const pid = child.pid

    controller.abort(new Error('attempt timed out'))
    await child.stop(running)

    expect({settled: await running, alive: isAlive(pid)}).toEqual({
      settled: 'attempt timed out',
      alive: false,
    })
  })

  test('a timed-out run settles only after the process has exited', async () => {
    const ready = join(directory, 'ready')
    const child = controlledChild()
    const running = run(
      process.execPath,
      ['-e', ignoreSigterm(ready)],
      0.5,
    ).catch((error: Error) => error.message)
    await child.spawned
    const pid = child.pid
    await vi.advanceTimersByTimeAsync(500)
    await child.stop(running)

    expect({settled: await running, alive: isAlive(pid)}).toEqual({
      settled: `${process.execPath} -e ${ignoreSigterm(ready)} timed out after 0.5s`,
      alive: false,
    })
  })
})

describe(AdbConnection.open.name, () => {
  test('an abort outside `runOnDevice` reads its reason twice and rejects a pending read with it', async () => {
    const controller = new AbortController()
    const reason = new Error('attempt timed out')
    let reads = 0
    Object.defineProperty(controller.signal, 'reason', {
      get: () => {
        reads += 1
        return reads <= 2 ? reason : new Error('read a third time')
      },
    })
    const socket = fakeSocket()
    const connection = await runAbortable(controller.signal, () => {
      const opening = AdbConnection.open(10)
      socket.emit('connect')
      return opening
    })

    controller.abort(reason)
    const error = await connection.readExact(1).catch((error: unknown) => error)

    expect({isReason: error === reason, reads}).toEqual({
      isReason: true,
      reads: 2,
    })
  })

  test('an abort under `runOnDevice` whose reason cannot be read rejects a pending read with a fallback', async () => {
    const controller = new AbortController()
    Object.defineProperty(controller.signal, 'reason', {
      get: () => {
        throw new Error('reason getter failed')
      },
    })
    const socket = fakeSocket()
    const connection = await runInspecting(GUARDED_INSPECTION, () =>
      runAbortable(controller.signal, () => {
        const opening = AdbConnection.open(10)
        socket.emit('connect')
        return opening
      }),
    )

    controller.abort()
    const error = await connection.readExact(1).catch((error: unknown) => error)

    expect({
      message: (error as Error).message,
      hasCause: Object.hasOwn(error as Error, 'cause'),
    }).toEqual({
      message: UNPRINTABLE_ERROR,
      hasCause: false,
    })
  })
})

// The pid goes to a temporary file that is renamed into place, so the ready
// file never exists without its pid.
function ignoreSigterm(ready: string): string {
  return `process.on('SIGTERM', () => {}); const fs = require('node:fs'); fs.writeFileSync(${JSON.stringify(`${ready}.tmp`)}, String(process.pid)); fs.renameSync(${JSON.stringify(`${ready}.tmp`)}, ${JSON.stringify(ready)}); setInterval(() => {}, 1000)`
}

function controlledChild() {
  vi.useFakeTimers()
  const child = new ChildProcess()
  const spawned = Promise.withResolvers<void>()
  const pid = 123456789
  let alive = true
  vi.spyOn(childProcesses, 'spawn').mockImplementation(() => {
    spawned.resolve()
    return child
  })
  const kill = vi.spyOn(child, 'kill').mockReturnValue(true)
  vi.spyOn(process, 'kill').mockImplementation((target, signal) => {
    expect([target, signal]).toEqual([pid, 0])
    if (alive) {
      return true
    }
    throw new Error('process exited')
  })
  return {
    pid,
    spawned: spawned.promise,
    stop: async (running: Promise<unknown>) => {
      let settled = false
      void running.then(() => {
        settled = true
      })
      expect(kill.mock.calls).toEqual([['SIGTERM']])
      await vi.advanceTimersByTimeAsync(KILL_GRACE_SECONDS * 1000)
      expect({signals: kill.mock.calls, settled}).toEqual({
        signals: [['SIGTERM'], ['SIGKILL']],
        settled: false,
      })
      alive = false
      child.emit('close', null, 'SIGKILL')
    },
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function fakeSocket(): EventEmitter {
  const socket = Object.assign(new EventEmitter(), {
    setTimeout: () => {},
    destroy: () => {
      socket.emit('close')
    },
  })
  vi.spyOn(net, 'connect').mockReturnValue(socket as never)
  return socket
}

// What `adb get-state` answered on emulators in real runs of these tests.
const recordedDead = {
  stdout: '',
  stderr: 'error: device offline\n',
  status: 1,
}
const recordedGone = {
  stdout: '',
  stderr: "error: device 'emulator-5554' not found\n",
  status: 1,
}
const recordedReachable = {stdout: 'device\n', stderr: '', status: 0}

describe(deviceVerdict.name, () => {
  test('reads a device as reachable only when `adb get-state` prints `device`, whatever it prints on stderr', () => {
    expect(
      deviceVerdict({
        stdout: 'device\n',
        stderr: '* daemon not running; starting now at tcp:5037\n',
        timedOut: false,
      }),
    ).toEqual('device')
  })

  test('reads the answers a real emulator gave, dead, gone and reachable', () => {
    expect([
      deviceVerdict({...recordedDead, timedOut: false}),
      deviceVerdict({...recordedGone, timedOut: false}),
      deviceVerdict({...recordedReachable, timedOut: false}),
    ]).toEqual(['lost', 'lost', 'device'])
  })

  test('reads a device as lost when adb reports it offline or has no such device', () => {
    expect([
      deviceVerdict({stdout: 'offline\n', stderr: '', timedOut: false}),
      deviceVerdict({
        stdout: '',
        stderr: 'error: device offline\n',
        timedOut: false,
      }),
      deviceVerdict({
        stdout: '',
        stderr: 'error: no devices/emulators found\n',
        timedOut: false,
      }),
      deviceVerdict({
        stdout: '',
        stderr: "error: device 'emulator-5554' not found\n",
        timedOut: false,
      }),
    ]).toEqual(['lost', 'lost', 'lost', 'lost'])
  })

  test('gives no verdict for a device adb sees in another state, for any other error, or for an `adb get-state` that never answered', () => {
    expect([
      deviceVerdict({stdout: 'unauthorized\n', stderr: '', timedOut: false}),
      deviceVerdict({stdout: 'bootloader\n', stderr: '', timedOut: false}),
      deviceVerdict({stdout: 'recovery\n', stderr: '', timedOut: false}),
      deviceVerdict({stdout: 'unknown\n', stderr: '', timedOut: false}),
      deviceVerdict({
        stdout: '',
        stderr: 'error: cannot connect to daemon\n',
        timedOut: false,
      }),
      deviceVerdict({stdout: '', stderr: '', timedOut: true}),
      deviceVerdict({stdout: 'offline\n', stderr: '', timedOut: true}),
    ]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
  })
})

describe(adbLostDevice.name, () => {
  test("matches `error: closed` but does not match `device 'x' not found`", () => {
    expect([
      adbLostDevice(new CommandError('error: closed')),
      adbLostDevice(new CommandError("device 'x' not found")),
    ]).toEqual([{adbError: 'error: closed'}, undefined])
  })
})
