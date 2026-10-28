import {existsSync, mkdtempSync, readFileSync, rmSync, watch} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, beforeEach, describe, expect, test} from 'vitest'
import {run} from './adb.ts'
import {runAbortable} from './util.ts'

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'android-ime-adb-'))
})

afterEach(() => {
  rmSync(directory, {recursive: true, force: true})
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
    const running = run(process.execPath, ['-e', ignoreSigterm(ready)], 0.5).catch(
      (error: Error) => error.message,
    )
    await fileAppears(ready)
    const pid = Number(readFileSync(ready, 'utf8'))

    expect({settled: await running, alive: isAlive(pid)}).toEqual({
      settled: `${process.execPath} -e ${ignoreSigterm(ready)} timed out after 0.5s`,
      alive: false,
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
