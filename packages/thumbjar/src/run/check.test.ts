import * as childProcesses from 'node:child_process'
import {spawnSync} from 'node:child_process'
import {
  chmodSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, test, expect, vi} from 'vitest'

vi.mock(import('node:child_process'), async (importOriginal) => ({
  ...(await importOriginal()),
}))

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

describe('thumbjar run device check', () => {
  test('reads a device that prints `device` as reachable, whatever adb prints on stderr', async () => {
    expect(
      await controlledDeviceState({
        stdout: 'device\n',
        stderr:
          '* daemon not running; starting now at tcp:5037\n* daemon started successfully\n',
        status: 0,
      }),
    ).toEqual({timing: 'BOOTED at 160\nCHECKED device\n', status: 0})
  })

  test('marks the device lost when adb finds none', async () => {
    expect(
      await controlledDeviceState({
        stdout: '',
        stderr: 'error: no devices/emulators found\n',
        status: 1,
      }),
    ).toEqual({timing: 'BOOTED at 160\nCHECKED lost\n', status: 0})
  })

  test('marks the device lost when adb reads it as offline', async () => {
    expect(
      await controlledDeviceState({stdout: 'offline\n', stderr: '', status: 0}),
    ).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks the device lost when adb names the device it cannot find', async () => {
    expect(await controlledDeviceState(recordedGone)).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks the device lost when adb fails with the device offline, as a dead emulator answered in a real run', async () => {
    expect(await controlledDeviceState(recordedDead)).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks a reachable device as reachable, as it answered in a real run after a failed prep', async () => {
    expect(await controlledDeviceState(recordedReachable)).toEqual({
      timing: 'BOOTED at 160\nCHECKED device\n',
      status: 0,
    })
  })

  test('records no verdict, and fails, for an unauthorized device or any other adb error', async () => {
    expect([
      await controlledDeviceState({
        stdout: 'unauthorized\n',
        stderr: '',
        status: 0,
      }),
      await controlledDeviceState({
        stdout: '',
        stderr: 'error: cannot connect to daemon\n',
        status: 1,
      }),
    ]).toEqual([
      {timing: 'BOOTED at 160\n', status: 1},
      {timing: 'BOOTED at 160\n', status: 1},
    ])
  })

  test('records no verdict, and fails, when `adb get-state` does not answer within its timeout', () => {
    expect(
      deviceState({stdout: '', stderr: '', status: 0, hang: true}),
    ).toEqual({timing: 'BOOTED at 160\n', status: 1})
  }, 15_000)
})

function deviceState(adb: {
  stdout: string
  stderr: string
  status: number
  hang?: boolean
}) {
  const directory = mkdtempSync(join(tmpdir(), 'emulator-runs-'))
  try {
    writeFileSync(
      join(directory, 'adb'),
      adb.hang
        ? '#!/usr/bin/env bash\nexec sleep 60\n'
        : `#!/usr/bin/env bash\nprintf %s "$ADB_STDOUT"\nprintf %s "$ADB_STDERR" >&2\nexit ${adb.status}\n`,
    )
    chmodSync(join(directory, 'adb'), 0o755)
    writeFileSync(join(directory, 'timing.txt'), 'BOOTED at 160\n')
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('check.ts', import.meta.url)),
        join(directory, 'timing.txt'),
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          ADB_STDOUT: adb.stdout,
          ADB_STDERR: adb.stderr,
        },
      },
    )
    return {
      timing: readFileSync(join(directory, 'timing.txt'), 'utf8').replace(
        /^(CHECKED \w+) at \d+$/m,
        '$1',
      ),
      status: result.status,
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

async function controlledDeviceState(adb: {
  stdout: string
  stderr: string
  status: number
}) {
  const directory = mkdtempSync(join(tmpdir(), 'emulator-runs-'))
  const argv = process.argv
  const exitCode = process.exitCode
  try {
    const timing = join(directory, 'timing.txt')
    writeFileSync(timing, 'BOOTED at 160\n')
    process.argv = [process.execPath, 'check.ts', timing]
    process.exitCode = 0
    vi.spyOn(childProcesses, 'spawnSync').mockReturnValue({
      pid: 0,
      output: [null, null, null],
      signal: null,
      ...adb,
    })
    vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    vi.resetModules()
    await import('./check.ts')
    return {
      timing: readFileSync(timing, 'utf8').replace(
        /^(CHECKED \w+) at \d+$/m,
        '$1',
      ),
      status: process.exitCode,
    }
  } finally {
    process.argv = argv
    process.exitCode = exitCode
    vi.restoreAllMocks()
    rmSync(directory, {recursive: true, force: true})
  }
}
