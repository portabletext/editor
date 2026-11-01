import {spawnSync} from 'node:child_process'
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
import {
  bootSeconds,
  deviceVerdict,
  retryAfter,
  runResult,
} from './emulator-runs.ts'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const workflow = readFileSync(
  new URL('../../../../.github/workflows/android-ime.yml', import.meta.url),
  'utf8',
)

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

const neverBooted = 'EMULATOR_START at 100\n'
const booted =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED skipped at 880\nDONE at 900\n'
const failedReachable =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED device at 880\nDONE at 900\n'
const prepFailed =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED device at 400\n'
const interrupted = 'EMULATOR_START at 100\nBOOTED at 160\n'
const checkerTimedOut = 'EMULATOR_START at 100\nBOOTED at 160\nDONE at 900\n'
const lostInTests =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED lost at 700\nDONE at 760\n'
const lostInPrep = 'EMULATOR_START at 100\nBOOTED at 160\nCHECKED lost at 400\n'
const lostThenStalled =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED lost at 700\n'
const reachableThenStalled =
  'EMULATOR_START at 100\nBOOTED at 160\nCHECKED device at 700\n'
const retryNeverBooted = 'RETRY\nEMULATOR_START at 1000\n'
const retryBooted =
  'RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\nCHECKED skipped at 1780\nDONE at 1800\n'
const retryLost =
  'RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\nCHECKED lost at 1500\nDONE at 1560\n'
const retryInterrupted = 'RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\n'

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

describe(retryAfter.name, () => {
  test('retries a first run that never booted', () => {
    expect(retryAfter(neverBooted)).toEqual({
      retry: true,
      line: 'BOOT_RETRY: the emulator never booted, retrying once on a fresh emulator',
    })
  })

  test('retries a first run whose device adb lost after boot, in the tests or in the prep', () => {
    expect([retryAfter(lostInTests), retryAfter(lostInPrep)]).toEqual([
      {
        retry: true,
        line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
      },
      {
        retry: true,
        line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
      },
    ])
  })

  test('does not retry a first run whose tests or prep failed on a reachable device', () => {
    expect([retryAfter(booted), retryAfter(prepFailed)]).toEqual([
      {retry: false},
      {retry: false},
    ])
  })

  test('does not retry a first run that ended after boot without a completed device check', () => {
    expect([retryAfter(interrupted), retryAfter(checkerTimedOut)]).toEqual([
      {retry: false},
      {retry: false},
    ])
  })

  test('retries a first run whose device check found the device lost, whatever stopped the run after it', () => {
    expect(retryAfter(lostThenStalled)).toEqual({
      retry: true,
      line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
    })
  })

  test('does not retry a first run whose device check found the device reachable, whatever stopped the run after it', () => {
    expect([
      retryAfter(failedReachable),
      retryAfter(reachableThenStalled),
    ]).toEqual([{retry: false}, {retry: false}])
  })

  test('does not run a third time when the retry ended after boot without a completed device check', () => {
    expect([
      retryAfter(neverBooted + retryInterrupted),
      retryAfter(lostInTests + retryInterrupted),
    ]).toEqual([{retry: false}, {retry: false}])
  })

  test('does not run a third time when the retry of a run that never booted lost its device', () => {
    expect(retryAfter(neverBooted + retryLost)).toEqual({retry: false})
  })

  test('does not run a third time when the retry of a lost device lost its device too', () => {
    expect(retryAfter(lostInTests + retryLost)).toEqual({retry: false})
  })
})

describe(bootSeconds.name, () => {
  test('measures each run that booted from its own start', () => {
    expect([
      bootSeconds(booted),
      bootSeconds(neverBooted + retryBooted),
      bootSeconds(lostInTests + retryBooted),
      bootSeconds(lostInTests + retryLost),
      bootSeconds(neverBooted + retryNeverBooted),
    ]).toEqual([
      ['BOOT_SECONDS run 1: 60'],
      ['BOOT_SECONDS run 1: never booted', 'BOOT_SECONDS run 2: 60'],
      ['BOOT_SECONDS run 1: 60', 'BOOT_SECONDS run 2: 60'],
      ['BOOT_SECONDS run 1: 60', 'BOOT_SECONDS run 2: 60'],
      ['BOOT_SECONDS run 1: never booted', 'BOOT_SECONDS run 2: never booted'],
    ])
  })
})

describe(runResult.name, () => {
  test('passes a run that succeeded, and names the retry it took', () => {
    expect([
      runResult(booted, 'success'),
      runResult(neverBooted + retryBooted, 'success'),
      runResult(lostInTests + retryBooted, 'success'),
    ]).toEqual([
      {passed: true, line: 'run outcome: success'},
      {
        passed: true,
        line: 'run outcome: success, on the retry after the emulator never booted',
      },
      {
        passed: true,
        line: 'run outcome: success, on the retry after adb lost the device',
      },
    ])
  })

  test('fails a run that failed on a reachable device as its own result, and names the retry it took', () => {
    expect([
      runResult(booted, 'failure'),
      runResult(lostInPrep + retryBooted, 'failure'),
      runResult(neverBooted + retryBooted, 'failure'),
    ]).toEqual([
      {passed: false, line: 'run outcome: failure'},
      {
        passed: false,
        line: 'run outcome: failure, on the retry after adb lost the device',
      },
      {
        passed: false,
        line: 'run outcome: failure, on the retry after the emulator never booted',
      },
    ])
  })

  test('fails a retry that lost its device again as an infrastructure failure, not a test result', () => {
    expect(runResult(lostInTests + retryLost, 'failure')).toEqual({
      passed: false,
      line: 'run outcome: device lost twice, infrastructure failure, not a test result',
    })
  })

  test('fails a retry after a run that never booted that lost its device as an infrastructure failure', () => {
    expect(runResult(neverBooted + retryLost, 'failure')).toEqual({
      passed: false,
      line: 'run outcome: device lost on the retry after the emulator never booted, infrastructure failure, not a test result',
    })
  })

  test('fails a run that ended after boot without a completed device check as no test result, on the first run and on the retry', () => {
    expect([
      runResult(interrupted, 'failure'),
      runResult(checkerTimedOut, 'failure'),
      runResult(neverBooted + retryInterrupted, 'failure'),
      runResult(lostInTests + retryInterrupted, 'failure'),
    ]).toEqual([
      {
        passed: false,
        line: 'run outcome: the run ended after boot without a completed device check, not a test result',
      },
      {
        passed: false,
        line: 'run outcome: the run ended after boot without a completed device check, not a test result',
      },
      {
        passed: false,
        line: 'run outcome: the run ended after boot without a completed device check, on the retry after the emulator never booted, not a test result',
      },
      {
        passed: false,
        line: 'run outcome: the run ended after boot without a completed device check, on the retry after adb lost the device, not a test result',
      },
    ])
  })

  test('fails a run whose device check found the device reachable as its own result, whatever stopped the run after it', () => {
    expect(runResult(reachableThenStalled, 'failure')).toEqual({
      passed: false,
      line: 'run outcome: failure',
    })
  })

  test('reports a cancelled run as cancelled, whatever its device check recorded', () => {
    expect([
      runResult(interrupted, 'cancelled'),
      runResult(lostInTests + retryInterrupted, 'cancelled'),
    ]).toEqual([
      {passed: false, line: 'run outcome: cancelled'},
      {
        passed: false,
        line: 'run outcome: cancelled, on the retry after adb lost the device',
      },
    ])
  })

  test('fails an emulator that never booted as an infrastructure failure', () => {
    expect([
      runResult(neverBooted + retryNeverBooted, 'failure'),
      runResult(lostInTests + retryNeverBooted, 'failure'),
    ]).toEqual([
      {
        passed: false,
        line: 'run outcome: the emulator never booted twice, infrastructure failure, not a test result',
      },
      {
        passed: false,
        line: 'run outcome: the emulator never booted on the retry after adb lost the device, infrastructure failure, not a test result',
      },
    ])
  })
})

describe('emulator-runs.ts device-state', () => {
  test('reads a device that prints `device` as reachable, whatever adb prints on stderr', () => {
    expect(
      deviceState({
        stdout: 'device\n',
        stderr:
          '* daemon not running; starting now at tcp:5037\n* daemon started successfully\n',
        status: 0,
      }),
    ).toEqual({timing: 'BOOTED at 160\nCHECKED device\n', status: 0})
  })

  test('marks the device lost when adb finds none', () => {
    expect(
      deviceState({
        stdout: '',
        stderr: 'error: no devices/emulators found\n',
        status: 1,
      }),
    ).toEqual({timing: 'BOOTED at 160\nCHECKED lost\n', status: 0})
  })

  test('marks the device lost when adb reads it as offline', () => {
    expect(deviceState({stdout: 'offline\n', stderr: '', status: 0})).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks the device lost when adb names the device it cannot find', () => {
    expect(deviceState(recordedGone)).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks the device lost when adb fails with the device offline, as a dead emulator answered in a real run', () => {
    expect(deviceState(recordedDead)).toEqual({
      timing: 'BOOTED at 160\nCHECKED lost\n',
      status: 0,
    })
  })

  test('marks a reachable device as reachable, as it answered in a real run after a failed prep', () => {
    expect(deviceState(recordedReachable)).toEqual({
      timing: 'BOOTED at 160\nCHECKED device\n',
      status: 0,
    })
  })

  test('records no verdict, and fails, for an unauthorized device or any other adb error', () => {
    expect([
      deviceState({stdout: 'unauthorized\n', stderr: '', status: 0}),
      deviceState({
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

describe('emulator-runs.ts retry', () => {
  test('writes the retry decision to the step output, and its line to the log and the job summary', () => {
    expect([
      workflowCommand(['retry', 'timing.txt'], lostInTests),
      workflowCommand(['retry', 'timing.txt'], booted),
    ]).toEqual([
      {
        status: 0,
        stdout:
          'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator\n',
        output: 'retry=yes\n',
        summary:
          'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator\n',
        timing: `${lostInTests}RETRY\nEMULATOR_START\n`,
      },
      {
        status: 0,
        stdout: '',
        output: 'retry=no\n',
        summary: '',
        timing: booted,
      },
    ])
  })
})

describe('emulator-runs.ts result', () => {
  test('passes a job whose last run succeeded, and fails one whose last run lost its device twice, with its line in the log and the job summary', () => {
    expect([
      workflowCommand(
        ['result', 'timing.txt', 'success'],
        lostInTests + retryBooted,
      ),
      workflowCommand(
        ['result', 'timing.txt', 'failure'],
        lostInTests + retryLost,
      ),
    ]).toEqual([
      {
        status: 0,
        stdout:
          'run outcome: success, on the retry after adb lost the device\n',
        output: '',
        summary:
          'run outcome: success, on the retry after adb lost the device\n',
        timing: lostInTests + retryBooted,
      },
      {
        status: 1,
        stdout:
          'run outcome: device lost twice, infrastructure failure, not a test result\n',
        output: '',
        summary:
          'run outcome: device lost twice, infrastructure failure, not a test result\n',
        timing: lostInTests + retryLost,
      },
    ])
  })
})

describe('the workflow', () => {
  test('decides the retry and the result with `emulator-runs.ts`', () => {
    expect({
      retry:
        /^ {8}run: (node android\/scripts\/emulator-runs\.ts retry .*)$/m.exec(
          workflow,
        )?.[1],
      retryIf: /^ {8}id: run2\n {8}if: (.*)$/m.exec(workflow)?.[1],
      result:
        /^ {8}run: (node android\/scripts\/emulator-runs\.ts result .*)$/m.exec(
          workflow,
        )?.[1],
      bootTime:
        /^ {10}(node android\/scripts\/emulator-runs\.ts boot-seconds .*)$/m.exec(
          workflow,
        )?.[1],
    }).toEqual({
      bootTime:
        'node android/scripts/emulator-runs.ts boot-seconds android/out/timing.txt',
      retry:
        'node android/scripts/emulator-runs.ts retry android/out/timing.txt',
      retryIf:
        "steps.run1.outcome == 'failure' && steps.retry.outputs.retry == 'yes'",
      result:
        'node android/scripts/emulator-runs.ts result android/out/timing.txt "${{ steps.run2.outcome != \'skipped\' && steps.run2.outcome || steps.run1.outcome }}"',
    })
  })
})

function workflowCommand(args: string[], timing: string) {
  const directory = mkdtempSync(join(tmpdir(), 'emulator-runs-'))
  try {
    writeFileSync(join(directory, 'timing.txt'), timing)
    writeFileSync(join(directory, 'output'), '')
    writeFileSync(join(directory, 'summary'), '')
    const result = spawnSync(
      'node',
      [join(packageRoot, 'android/scripts/emulator-runs.ts'), ...args],
      {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_OUTPUT: join(directory, 'output'),
          GITHUB_STEP_SUMMARY: join(directory, 'summary'),
        },
      },
    )
    return {
      status: result.status,
      stdout: result.stdout,
      output: readFileSync(join(directory, 'output'), 'utf8'),
      summary: readFileSync(join(directory, 'summary'), 'utf8'),
      timing: `${timing}${readFileSync(join(directory, 'timing.txt'), 'utf8')
        .slice(timing.length)
        .replace(/^(EMULATOR_START) at \d+$/m, '$1')}`,
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

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
      'node',
      [
        'android/scripts/emulator-runs.ts',
        'device-state',
        join(directory, 'timing.txt'),
      ],
      {
        cwd: packageRoot,
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
