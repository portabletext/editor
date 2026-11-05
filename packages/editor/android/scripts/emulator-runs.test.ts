import {spawnSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {basename, join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {describe, expect, test} from 'vitest'
import {
  bootSeconds,
  deviceVerdict,
  installCleanupPaths,
  installResult,
  retryAfter,
  runResult,
} from './emulator-runs.mjs'

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
// The prep failure `run-on-device.sh` records for a real CI boot whose Gboard never loaded the dictionary.
const NEVER_LOADED =
  "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show. See ja-dictionary.log for the dictionary lines it saw."
const dictionaryNeverLoaded = `EMULATOR_START at 100\nBOOTED at 160\nPREP FAILED: ${NEVER_LOADED}\nPREP DICTIONARY_NOT_LOADED\nCHECKED device at 700\n`
const dictionaryNeverLoadedLost = `EMULATOR_START at 100\nBOOTED at 160\nPREP FAILED: ${NEVER_LOADED}\nPREP DICTIONARY_NOT_LOADED\nCHECKED lost at 700\n`
const dictionaryNeverLoadedUnchecked = `EMULATOR_START at 100\nBOOTED at 160\nPREP FAILED: ${NEVER_LOADED}\nPREP DICTIONARY_NOT_LOADED\n`
// The prep failure `run-on-device.sh` records when the dictionary loaded but Gboard did not convert with it.
const dictionaryCheckFailed =
  'EMULATOR_START at 100\nBOOTED at 160\nPREP FAILED: japanese dictionary check, see ja-dictionary.log\nCHECKED device at 700\n'
const retryDictionaryNeverLoaded = `RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\nPREP FAILED: ${NEVER_LOADED}\nPREP DICTIONARY_NOT_LOADED\nCHECKED device at 1600\n`
const retryDictionaryCheckFailed =
  'RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\nPREP FAILED: japanese dictionary check, see ja-dictionary.log\nCHECKED device at 1600\n'
const retryFailedReachable =
  'RETRY\nEMULATOR_START at 1000\nBOOTED at 1060\nCHECKED device at 1780\nDONE at 1800\n'
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

  test("retries a first run whose prep failed on a reachable device because Gboard's Japanese dictionary never loaded", () => {
    expect(retryAfter(dictionaryNeverLoaded)).toEqual({
      retry: true,
      line: "DICTIONARY_RETRY: Gboard's Japanese dictionary never loaded, retrying once on a fresh emulator",
    })
  })

  test('retries a first run whose dictionary never loaded and whose device adb then lost as a lost device', () => {
    expect(retryAfter(dictionaryNeverLoadedLost)).toEqual({
      retry: true,
      line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
    })
  })

  test('does not retry a first run whose dictionary never loaded but that ended without a completed device check', () => {
    expect(retryAfter(dictionaryNeverLoadedUnchecked)).toEqual({retry: false})
  })

  test('does not retry a prep that failed on a reachable device for any other reason, the dictionary check after the load included', () => {
    expect(retryAfter(dictionaryCheckFailed)).toEqual({retry: false})
  })

  test('does not run a third time after a retry, whatever the dictionary did on either run', () => {
    expect([
      retryAfter(dictionaryNeverLoaded + retryDictionaryNeverLoaded),
      retryAfter(dictionaryNeverLoaded + retryLost),
      retryAfter(dictionaryNeverLoaded + retryNeverBooted),
      retryAfter(lostInTests + retryDictionaryNeverLoaded),
      retryAfter(neverBooted + retryDictionaryNeverLoaded),
    ]).toEqual([
      {retry: false},
      {retry: false},
      {retry: false},
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

  test("fails a prep that failed on a reachable device with the prep's own reason, on the first run and on the retry", () => {
    expect([
      runResult(dictionaryCheckFailed, 'failure'),
      runResult(lostInTests + retryDictionaryCheckFailed, 'failure'),
    ]).toEqual([
      {
        passed: false,
        line: 'run outcome: failure, the prep failed: japanese dictionary check, see ja-dictionary.log',
      },
      {
        passed: false,
        line: 'run outcome: failure, on the retry after adb lost the device, the prep failed: japanese dictionary check, see ja-dictionary.log',
      },
    ])
  })

  test("fails a first run whose dictionary never loaded with the prep's own reason when it could not retry", () => {
    expect(runResult(dictionaryNeverLoaded, 'failure')).toEqual({
      passed: false,
      line: `run outcome: failure, the prep failed: ${NEVER_LOADED}`,
    })
  })

  test('names the dictionary that never loaded in the result of its retry', () => {
    expect([
      runResult(dictionaryNeverLoaded + retryBooted, 'success'),
      runResult(dictionaryNeverLoaded + retryFailedReachable, 'failure'),
      runResult(dictionaryNeverLoaded + retryDictionaryCheckFailed, 'failure'),
      runResult(dictionaryNeverLoaded + retryInterrupted, 'failure'),
    ]).toEqual([
      {
        passed: true,
        line: "run outcome: success, on the retry after Gboard's Japanese dictionary never loaded",
      },
      {
        passed: false,
        line: "run outcome: failure, on the retry after Gboard's Japanese dictionary never loaded",
      },
      {
        passed: false,
        line: "run outcome: failure, on the retry after Gboard's Japanese dictionary never loaded, the prep failed: japanese dictionary check, see ja-dictionary.log",
      },
      {
        passed: false,
        line: "run outcome: the run ended after boot without a completed device check, on the retry after Gboard's Japanese dictionary never loaded, not a test result",
      },
    ])
  })

  test('fails a retry after a dictionary that never loaded that lost its device or never booted as an infrastructure failure', () => {
    expect([
      runResult(dictionaryNeverLoaded + retryLost, 'failure'),
      runResult(dictionaryNeverLoaded + retryNeverBooted, 'failure'),
    ]).toEqual([
      {
        passed: false,
        line: "run outcome: device lost on the retry after Gboard's Japanese dictionary never loaded, infrastructure failure, not a test result",
      },
      {
        passed: false,
        line: "run outcome: the emulator never booted on the retry after Gboard's Japanese dictionary never loaded, infrastructure failure, not a test result",
      },
    ])
  })

  test('fails a retry whose dictionary never loaded on a reachable device as an infrastructure failure, not a test result', () => {
    expect([
      runResult(dictionaryNeverLoaded + retryDictionaryNeverLoaded, 'failure'),
      runResult(lostInTests + retryDictionaryNeverLoaded, 'failure'),
      runResult(neverBooted + retryDictionaryNeverLoaded, 'failure'),
    ]).toEqual([
      {
        passed: false,
        line: "run outcome: Gboard's Japanese dictionary never loaded twice, infrastructure failure, not a test result",
      },
      {
        passed: false,
        line: "run outcome: Gboard's Japanese dictionary never loaded on the retry after adb lost the device, infrastructure failure, not a test result",
      },
      {
        passed: false,
        line: "run outcome: Gboard's Japanese dictionary never loaded on the retry after the emulator never booted, infrastructure failure, not a test result",
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

describe(installCleanupPaths.name, () => {
  test('removes only paths created by the install, preserving existing packages and downloads', () => {
    expect(
      installCleanupPaths(
        ['.temp/PackageOperation01', 'platform-tools'],
        [
          '.temp/PackageOperation01',
          '.temp/PackageOperation02',
          'platform-tools',
          'system-images/android-36/google_apis_playstore/x86_64',
        ],
      ),
    ).toEqual([
      '.temp/PackageOperation02',
      'system-images/android-36/google_apis_playstore/x86_64',
    ])
    expect(installCleanupPaths(['emulator'], ['emulator'])).toEqual([])
  })
})

describe(installResult.name, () => {
  test('fails two failed installs as infrastructure, regardless of timing or run outcome', () => {
    expect(installResult(booted, 'success', 'failure', 'failure')).toEqual({
      passed: false,
      line: 'run outcome: the emulator install failed twice, infrastructure failure, not a test result',
    })
  })

  test('names a successful install retry beside the unchanged run result', () => {
    expect(installResult(booted, 'success', 'failure', 'success')).toEqual({
      passed: true,
      line: 'run outcome: success',
      installLine: 'install outcome: retried once after a failed install',
    })
    expect(
      installResult(lostInTests + retryLost, 'failure', 'failure', 'success'),
    ).toEqual({
      passed: false,
      line: 'run outcome: device lost twice, infrastructure failure, not a test result',
      installLine: 'install outcome: retried once after a failed install',
    })
  })

  test('preserves a first install success', () => {
    expect(installResult(booted, 'success', 'success', 'skipped')).toEqual({
      passed: true,
      line: 'run outcome: success',
    })
  })

  test('reports cancellation during the first install when the emulator runs were skipped', () => {
    expect(installResult('', 'skipped', 'cancelled', 'skipped')).toEqual({
      passed: false,
      line: 'run outcome: cancelled',
    })
  })

  test('reports cancellation during the install retry when the emulator runs were skipped', () => {
    expect(installResult('', 'skipped', 'failure', 'cancelled')).toEqual({
      passed: false,
      line: 'run outcome: cancelled',
    })
  })

  test('overrides a cancelled job only before an emulator run started', () => {
    expect([
      installResult('', 'skipped', 'skipped', 'skipped', 'cancelled'),
      installResult('', 'skipped', 'failure', 'skipped', 'cancelled'),
      installResult(
        'INSTALL_RETRY\n',
        'skipped',
        'success',
        'skipped',
        'cancelled',
      ),
      installResult(booted, 'success', 'failure', 'failure', 'cancelled'),
      installResult(booted, 'success', 'failure', 'success', 'cancelled'),
      installResult(booted, 'success', 'success', 'skipped', 'cancelled'),
    ]).toEqual([
      {passed: false, line: 'run outcome: cancelled'},
      {passed: false, line: 'run outcome: cancelled'},
      {passed: false, line: 'run outcome: cancelled'},
      {
        passed: false,
        line: 'run outcome: the emulator install failed twice, infrastructure failure, not a test result',
      },
      {
        passed: true,
        line: 'run outcome: success',
        installLine: 'install outcome: retried once after a failed install',
      },
      {passed: true, line: 'run outcome: success'},
    ])
    expect(
      installResult('', 'skipped', 'skipped', 'skipped', 'failure'),
    ).toEqual({
      passed: false,
      line: 'run outcome: no emulator run, a step before the emulator install failed',
    })
  })

  test('names an earlier step failure when neither install ran', () => {
    expect(installResult('', 'skipped', 'skipped', 'skipped')).toEqual({
      passed: false,
      line: 'run outcome: no emulator run, a step before the emulator install failed',
    })
  })
})

describe('emulator-runs.mjs install-retry', () => {
  test('clears new download and package paths, retaining preexisting and unrelated SDK files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-paths-'))
    try {
      const sdk = join(directory, 'sdk')
      mkdirSync(join(directory, 'android/out'), {recursive: true})
      mkdirSync(join(sdk, '.temp/PackageOperation01'), {recursive: true})
      mkdirSync(join(sdk, '.temp/unrelated'), {recursive: true})
      mkdirSync(join(sdk, 'platform-tools'), {recursive: true})
      const start = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'install-start',
          sdk,
          '36',
        ],
        {cwd: directory, encoding: 'utf8'},
      )
      expect({
        status: start.status,
        stdout: start.stdout,
        stderr: start.stderr,
      }).toEqual({status: 0, stdout: '', stderr: ''})
      mkdirSync(join(sdk, '.temp/PackageOperation02/unzip'), {recursive: true})
      mkdirSync(
        join(
          sdk,
          'system-images/android-36/google_apis_playstore/x86_64/.installer',
        ),
        {recursive: true},
      )
      mkdirSync(
        join(sdk, 'system-images/android-35/google_apis_playstore/x86_64'),
        {recursive: true},
      )
      const retry = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'install-retry',
          sdk,
          '36',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            GITHUB_STEP_SUMMARY: join(directory, 'summary'),
          },
        },
      )
      expect({
        status: retry.status,
        stdout: retry.stdout,
        stderr: retry.stderr,
        summary: readFileSync(join(directory, 'summary'), 'utf8'),
      }).toEqual({
        status: 0,
        stdout:
          'INSTALL_RETRY: the emulator install failed, retrying once after clearing its downloads and incomplete packages\n',
        stderr: '',
        summary:
          'INSTALL_RETRY: the emulator install failed, retrying once after clearing its downloads and incomplete packages\n',
      })
      expect([
        existsSync(join(sdk, '.temp/PackageOperation01')),
        existsSync(join(sdk, '.temp/unrelated')),
        existsSync(join(sdk, 'platform-tools')),
        existsSync(join(sdk, '.temp/PackageOperation02')),
        existsSync(
          join(sdk, 'system-images/android-36/google_apis_playstore/x86_64'),
        ),
        existsSync(
          join(sdk, 'system-images/android-35/google_apis_playstore/x86_64'),
        ),
      ]).toEqual([true, true, true, false, false, true])
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('retries without clearing any paths when no snapshot exists', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-retry-'))
    try {
      const sdk = join(directory, 'sdk')
      mkdirSync(join(sdk, '.temp/PackageOperation01'), {recursive: true})
      mkdirSync(join(sdk, 'emulator'), {recursive: true})
      const retry = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'install-retry',
          sdk,
          '36',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            GITHUB_STEP_SUMMARY: join(directory, 'summary'),
          },
        },
      )
      expect({
        status: retry.status,
        stdout: retry.stdout,
        stderr: retry.stderr,
        summary: existsSync(join(directory, 'summary'))
          ? readFileSync(join(directory, 'summary'), 'utf8')
          : '',
      }).toEqual({
        status: 0,
        stdout:
          'INSTALL_RETRY: no install snapshot existed, retrying once without clearing paths\n',
        stderr: '',
        summary:
          'INSTALL_RETRY: no install snapshot existed, retrying once without clearing paths\n',
      })
      expect([
        existsSync(join(sdk, '.temp/PackageOperation01')),
        existsSync(join(sdk, 'emulator')),
      ]).toEqual([true, true])
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describe('emulator-runs.mjs install-start', () => {
  test('records no paths for an SDK that does not exist', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-start-'))
    try {
      const emptySdk = join(directory, 'empty-sdk')
      const empty = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'install-start',
          emptySdk,
          '36',
        ],
        {cwd: directory, encoding: 'utf8'},
      )
      expect({
        status: empty.status,
        paths: readFileSync(
          join(directory, 'android/out/install-paths.txt'),
          'utf8',
        ),
      }).toEqual({status: 0, paths: ''})
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describe('emulator-runs.mjs boot-seconds', () => {
  test('prints no boot time without timing.txt', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-result-'))
    try {
      const boot = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'boot-seconds',
          'missing.txt',
        ],
        {cwd: directory, encoding: 'utf8'},
      )
      expect({
        status: boot.status,
        stdout: boot.stdout,
        stderr: boot.stderr,
      }).toEqual({status: 0, stdout: '', stderr: ''})
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })
})

describe('emulator-runs.mjs result after the emulator install', () => {
  test('keeps the run retry reason when a job is cancelled during the retry run', () => {
    expect(
      workflowCommand(
        ['result', 'timing.txt', 'cancelled'],
        lostInTests + retryInterrupted,
        {
          INSTALL1_OUTCOME: 'failure',
          INSTALL2_OUTCOME: 'success',
          JOB_STATUS: 'cancelled',
        },
      ),
    ).toEqual({
      status: 1,
      stdout:
        'install outcome: retried once after a failed install\nrun outcome: cancelled, on the retry after adb lost the device\n',
      output: '',
      summary:
        'install outcome: retried once after a failed install\nrun outcome: cancelled, on the retry after adb lost the device\n',
      timing: lostInTests + retryInterrupted,
    })
  })

  test('reports cancellation after installation before Record start without timing.txt', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-result-'))
    try {
      const result = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'result',
          'missing.txt',
          'skipped',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            INSTALL1_OUTCOME: 'success',
            INSTALL2_OUTCOME: 'skipped',
            JOB_STATUS: 'cancelled',
            GITHUB_STEP_SUMMARY: join(directory, 'summary'),
          },
        },
      )
      expect({
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: readFileSync(join(directory, 'summary'), 'utf8'),
      }).toEqual({
        status: 1,
        stdout: 'run outcome: cancelled\n',
        stderr: '',
        summary: 'run outcome: cancelled\n',
      })
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('reports two install failures without timing.txt', () => {
    const directory = mkdtempSync(join(tmpdir(), 'install-result-'))
    try {
      const result = spawnSync(
        'node',
        [
          join(packageRoot, 'android/scripts/emulator-runs.mjs'),
          'result',
          'missing.txt',
          'skipped',
        ],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            INSTALL1_OUTCOME: 'failure',
            INSTALL2_OUTCOME: 'failure',
            GITHUB_STEP_SUMMARY: join(directory, 'summary'),
          },
        },
      )
      expect({
        status: result.status,
        stdout: result.stdout,
        stderr: result.stderr,
        summary: readFileSync(join(directory, 'summary'), 'utf8'),
      }).toEqual({
        status: 1,
        stdout:
          'run outcome: the emulator install failed twice, infrastructure failure, not a test result\n',
        stderr: '',
        summary:
          'run outcome: the emulator install failed twice, infrastructure failure, not a test result\n',
      })
    } finally {
      rmSync(directory, {recursive: true, force: true})
    }
  })

  test('reports a successful install retry before the unchanged run line in stdout and the summary', () => {
    expect(
      workflowCommand(
        ['result', 'timing.txt', 'success'],
        lostInTests + retryBooted,
        {INSTALL1_OUTCOME: 'failure', INSTALL2_OUTCOME: 'success'},
      ),
    ).toEqual({
      status: 0,
      stdout:
        'install outcome: retried once after a failed install\nrun outcome: success, on the retry after adb lost the device\n',
      output: '',
      summary:
        'install outcome: retried once after a failed install\nrun outcome: success, on the retry after adb lost the device\n',
      timing: lostInTests + retryBooted,
    })
  })

  test('reports first install cancellation using the workflow result argument', () => {
    expect(
      workflowCommand(['result', 'timing.txt', 'skipped'], '', {
        INSTALL1_OUTCOME: 'cancelled',
        INSTALL2_OUTCOME: 'skipped',
      }),
    ).toEqual({
      status: 1,
      stdout: 'run outcome: cancelled\n',
      output: '',
      summary: 'run outcome: cancelled\n',
      timing: '',
    })
  })

  test('reports install retry cancellation using the workflow result argument', () => {
    expect(
      workflowCommand(['result', 'timing.txt', 'skipped'], '', {
        INSTALL1_OUTCOME: 'failure',
        INSTALL2_OUTCOME: 'cancelled',
      }),
    ).toEqual({
      status: 1,
      stdout: 'run outcome: cancelled\n',
      output: '',
      summary: 'run outcome: cancelled\n',
      timing: '',
    })
  })

  test('reports a job cancelled before installation', () => {
    expect(
      workflowCommand(['result', 'timing.txt', 'skipped'], '', {
        INSTALL1_OUTCOME: 'skipped',
        INSTALL2_OUTCOME: 'skipped',
        JOB_STATUS: 'cancelled',
      }),
    ).toEqual({
      status: 1,
      stdout: 'run outcome: cancelled\n',
      output: '',
      summary: 'run outcome: cancelled\n',
      timing: '',
    })
  })

  test('reports a job cancelled between the install attempts', () => {
    expect(
      workflowCommand(['result', 'timing.txt', 'skipped'], '', {
        INSTALL1_OUTCOME: 'failure',
        INSTALL2_OUTCOME: 'skipped',
        JOB_STATUS: 'cancelled',
      }),
    ).toEqual({
      status: 1,
      stdout: 'run outcome: cancelled\n',
      output: '',
      summary: 'run outcome: cancelled\n',
      timing: '',
    })
  })

  test('reports an earlier step failure using the workflow result argument', () => {
    expect(
      workflowCommand(['result', 'timing.txt', 'skipped'], '', {
        INSTALL1_OUTCOME: 'skipped',
        INSTALL2_OUTCOME: 'skipped',
      }),
    ).toEqual({
      status: 1,
      stdout:
        'run outcome: no emulator run, a step before the emulator install failed\n',
      output: '',
      summary:
        'run outcome: no emulator run, a step before the emulator install failed\n',
      timing: '',
    })
  })
})

describe('emulator-runs.mjs device-state', () => {
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

describe('emulator-runs.mjs imported from an entry `node` cannot resolve', () => {
  test('imports without running its command, from stdin and from an entry path that does not exist', () => {
    expect([
      importFromEntry(
        join(packageRoot, 'android/scripts/emulator-runs.mjs'),
        '-',
      ),
      importFromEntry(
        join(packageRoot, 'android/scripts/emulator-runs.mjs'),
        'missing',
      ),
    ]).toEqual([
      {status: 0, stdout: 'imported\n', stderr: ''},
      {status: 0, stdout: 'imported\n', stderr: ''},
    ])
  })
})

describe('emulator-runs.mjs run as `node`’s entry whose file is removed once loaded', () => {
  test('still runs its command, with `import.meta.main` and with the fallback for Node without it', () => {
    expect([
      runRemovedAfterLoad(
        join(packageRoot, 'android/scripts/emulator-runs.mjs'),
        [],
        'native',
      ),
      runRemovedAfterLoad(
        join(packageRoot, 'android/scripts/emulator-runs.mjs'),
        [],
        'removed',
      ),
    ]).toEqual([
      {
        status: 2,
        stdout: '',
        stderr:
          'usage: node android/scripts/emulator-runs.mjs device-state|retry|boot-seconds <timing.txt> | result <timing.txt> <outcome>\n',
        removed: true,
      },
      {
        status: 2,
        stdout: '',
        stderr:
          'usage: node android/scripts/emulator-runs.mjs device-state|retry|boot-seconds <timing.txt> | result <timing.txt> <outcome>\n',
        removed: true,
      },
    ])
  })
})

describe('emulator-runs.mjs retry', () => {
  test('writes the retry decision to the step output, and its line to the log and the job summary', () => {
    expect([
      workflowCommand(['retry', 'timing.txt'], lostInTests),
      workflowCommand(['retry', 'timing.txt'], dictionaryNeverLoaded),
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
        stdout:
          "DICTIONARY_RETRY: Gboard's Japanese dictionary never loaded, retrying once on a fresh emulator\n",
        output: 'retry=yes\n',
        summary:
          "DICTIONARY_RETRY: Gboard's Japanese dictionary never loaded, retrying once on a fresh emulator\n",
        timing: `${dictionaryNeverLoaded}RETRY\nEMULATOR_START\n`,
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

describe('emulator-runs.mjs result', () => {
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

describe('emulator-runs.mjs result after a failed prep', () => {
  test("quotes the prep's reason in the log and the job summary", () => {
    expect(
      workflowCommand(
        ['result', 'timing.txt', 'failure'],
        dictionaryNeverLoaded,
      ),
    ).toEqual({
      status: 1,
      stdout: `run outcome: failure, the prep failed: ${NEVER_LOADED}\n`,
      output: '',
      summary: `run outcome: failure, the prep failed: ${NEVER_LOADED}\n`,
      timing: dictionaryNeverLoaded,
    })
  })
})

describe('the workflow', () => {
  test('wires the first install to its snapshot command and step outcome', () => {
    const install =
      workflow
        .split('      - name: Install the emulator and its system image\n')[1]
        ?.split('\n      - ')[0] ?? ''
    expect({
      id: /^ {8}id: (.*)$/m.exec(install)?.[1],
      continueOnError: /^ {8}continue-on-error: (.*)$/m.exec(install)?.[1],
      command:
        /^ {10}(node android\/scripts\/emulator-runs\.mjs install-.*)$/m.exec(
          install,
        )?.[1],
    }).toEqual({
      id: 'install1',
      continueOnError: 'true',
      command:
        'node android/scripts/emulator-runs.mjs install-start "$ANDROID_HOME" "${{ matrix.api }}"',
    })
  })

  test('wires the install retry to its snapshot command and step outcome', () => {
    const install =
      workflow
        .split(
          '      - name: Install the emulator and its system image (retry)\n',
        )[1]
        ?.split('\n      - ')[0] ?? ''
    expect({
      id: /^ {8}id: (.*)$/m.exec(install)?.[1],
      continueOnError: /^ {8}continue-on-error: (.*)$/m.exec(install)?.[1],
      condition: /^ {8}if: (.*)$/m.exec(install)?.[1],
      command:
        /^ {10}(node android\/scripts\/emulator-runs\.mjs install-.*)$/m.exec(
          install,
        )?.[1],
    }).toEqual({
      id: 'install2',
      continueOnError: 'true',
      condition: "steps.install1.outcome == 'failure'",
      command:
        'node android/scripts/emulator-runs.mjs install-retry "$ANDROID_HOME" "${{ matrix.api }}"',
    })
  })

  test('gates Record start on a successful install', () => {
    const step =
      workflow
        .split('      - name: Record start\n')[1]
        ?.split('\n      - ')[0] ?? ''
    expect(/^ {8}if: (.*)$/m.exec(step)?.[1]).toEqual(
      "steps.install1.outcome == 'success' || steps.install2.outcome == 'success'",
    )
  })

  test('gates Run on emulator on a successful install', () => {
    const step =
      workflow
        .split('      - name: Run on emulator\n')[1]
        ?.split('\n      - ')[0] ?? ''
    expect(/^ {8}if: (.*)$/m.exec(step)?.[1]).toEqual(
      "steps.install1.outcome == 'success' || steps.install2.outcome == 'success'",
    )
  })

  test('passes the install step outcomes and job status to Result', () => {
    const result =
      workflow.split('      - name: Result\n')[1]?.split('\n      - ')[0] ?? ''
    expect({
      first: /^ {10}INSTALL1_OUTCOME: (.*)$/m.exec(result)?.[1],
      second: /^ {10}INSTALL2_OUTCOME: (.*)$/m.exec(result)?.[1],
      job: /^ {10}JOB_STATUS: (.*)$/m.exec(result)?.[1],
    }).toEqual({
      first: '${{ steps.install1.outcome }}',
      second: '${{ steps.install2.outcome }}',
      job: '${{ job.status }}',
    })
  })

  test('decides the retry and the result with `emulator-runs.mjs`', () => {
    expect({
      retry:
        /^ {8}run: (node android\/scripts\/emulator-runs\.mjs retry .*)$/m.exec(
          workflow,
        )?.[1],
      retryIf: /^ {8}id: run2\n {8}if: (.*)$/m.exec(workflow)?.[1],
      result:
        /^ {8}run: (node android\/scripts\/emulator-runs\.mjs result .*)$/m.exec(
          workflow,
        )?.[1],
      bootTime:
        /^ {10}(node android\/scripts\/emulator-runs\.mjs boot-seconds .*)$/m.exec(
          workflow,
        )?.[1],
    }).toEqual({
      bootTime:
        'node android/scripts/emulator-runs.mjs boot-seconds android/out/timing.txt',
      retry:
        'node android/scripts/emulator-runs.mjs retry android/out/timing.txt',
      retryIf:
        "steps.run1.outcome == 'failure' && steps.retry.outputs.retry == 'yes'",
      result:
        'node android/scripts/emulator-runs.mjs result android/out/timing.txt "${{ steps.run2.outcome != \'skipped\' && steps.run2.outcome || steps.run1.outcome }}"',
    })
  })
})

function importFromEntry(script: string, entry: '-' | 'missing') {
  const result = spawnSync('node', ['--input-type=module', '-'], {
    encoding: 'utf8',
    input: [
      'if (process.env.ENTRY) process.argv[1] = process.env.ENTRY',
      'await import(process.env.SCRIPT)',
      "console.log('imported')",
    ].join('\n'),
    env: {
      ...process.env,
      SCRIPT: pathToFileURL(script).href,
      ENTRY: entry === 'missing' ? join(tmpdir(), 'no-such-entry.mjs') : '',
    },
  })
  return {status: result.status, stdout: result.stdout, stderr: result.stderr}
}

function runRemovedAfterLoad(
  script: string,
  args: string[],
  mainFlag: 'native' | 'removed',
) {
  const directory = mkdtempSync(join(tmpdir(), 'removed-after-load-'))
  try {
    const entry = join(directory, basename(script))
    copyFileSync(script, entry)
    symlinkSync(
      join(packageRoot, 'node_modules'),
      join(directory, 'node_modules'),
    )
    // Removes the entry once Node has read it, and with `removed` takes away `import.meta.main`, so Node
    // 24 runs the fallback Node 22 has.
    writeFileSync(
      join(directory, 'hooks.mjs'),
      [
        "import {unlinkSync} from 'node:fs'",
        'export function load(url, context, nextLoad) {',
        '  const result = nextLoad(url, context)',
        '  return result instanceof Promise',
        '    ? result.then((loaded) => afterLoad(url, loaded))',
        '    : afterLoad(url, result)',
        '}',
        'function afterLoad(url, result) {',
        '  if (url !== process.env.ENTRY_URL) return result',
        '  unlinkSync(new URL(url))',
        "  if (process.env.MAIN_FLAG !== 'removed') return result",
        '  return {...result, source: `delete import.meta.main\\n${result.source}`}',
        '}',
      ].join('\n'),
    )
    writeFileSync(
      join(directory, 'register.mjs'),
      // `module.register()` is deprecated from Node 26 and warns on stderr, and Node 22.12 has no
      // `module.registerHooks()`.
      [
        "import * as module from 'node:module'",
        "import {load} from './hooks.mjs'",
        'if (module.registerHooks) module.registerHooks({load})',
        "else module.register('./hooks.mjs', import.meta.url)",
      ].join('\n'),
    )
    const result = spawnSync(
      'node',
      [
        '--import',
        pathToFileURL(join(directory, 'register.mjs')).href,
        entry,
        ...args,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          ENTRY_URL: pathToFileURL(entry).href,
          MAIN_FLAG: mainFlag,
        },
      },
    )
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      removed: !existsSync(entry),
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

function workflowCommand(
  args: string[],
  timing: string,
  workflowOutcomes: {
    INSTALL1_OUTCOME?: string
    INSTALL2_OUTCOME?: string
    JOB_STATUS?: string
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), 'emulator-runs-'))
  try {
    writeFileSync(join(directory, 'timing.txt'), timing)
    writeFileSync(join(directory, 'output'), '')
    writeFileSync(join(directory, 'summary'), '')
    const result = spawnSync(
      'node',
      [join(packageRoot, 'android/scripts/emulator-runs.mjs'), ...args],
      {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          ...workflowOutcomes,
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
        'android/scripts/emulator-runs.mjs',
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
