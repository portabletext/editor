import {EventEmitter} from 'node:events'
import {existsSync, mkdtempSync, readFileSync, rmSync, watch} from 'node:fs'
import net from 'node:net'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {AdbConnection, run} from './adb.ts'
import {
  GUARDED_INSPECTION,
  runAbortable,
  runInspecting,
  UNPRINTABLE_ERROR,
} from './util.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'android-ime-adb-'))
})

afterEach(() => {
  rmSync(directory, {recursive: true, force: true})
  vi.restoreAllMocks()
})

describe(run.name, () => {
  test('an aborted run settles only after a process that ignores SIGTERM has exited', async () => {
    const ready = join(directory, 'ready')
    const controller = new AbortController()
    const running = runAbortable(controller.signal, () =>
      run(process.execPath, ['-e', ignoreSigterm(ready)], 60),
    ).catch((error: Error) => error.message)
    await fileAppears(ready)
    const pid = Number(readFileSync(ready, 'utf8'))

    controller.abort(new Error('attempt timed out'))

    expect({settled: await running, alive: isAlive(pid)}).toEqual({
      settled: 'attempt timed out',
      alive: false,
    })
  })

  test('a timed-out run settles only after the process has exited', async () => {
    const ready = join(directory, 'ready')
    const running = run(
      process.execPath,
      ['-e', ignoreSigterm(ready)],
      0.5,
    ).catch((error: Error) => error.message)
    await fileAppears(ready)
    const pid = Number(readFileSync(ready, 'utf8'))

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

function fileAppears(path: string): Promise<void> {
  return new Promise((resolve) => {
    const watcher = watch(directory, () => {
      if (existsSync(path)) {
        watcher.close()
        resolve()
      }
    })
    if (existsSync(path)) {
      watcher.close()
      resolve()
    }
  })
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
