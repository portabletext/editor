import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test, vi} from 'vitest'
import {runOnDevice, typeOnDevice, withDriverRetry} from './driver.ts'
import {runSuite} from './testing.ts'

const root = fileURLToPath(new URL('..', import.meta.url))

describe(withDriverRetry.name, () => {
  test('a driver fault restarts and types once more', async () => {
    const calls: string[] = []

    const result = await withDriverRetry({
      name: 'ja-typing',
      attempt: (attempt) => {
        calls.push(`attempt ${attempt}`)
        if (attempt === 1) {
          return Promise.reject(new Error('Gboard window did not appear'))
        }
        return Promise.resolve('typed')
      },
      restart: () => {
        calls.push('restart')
        return Promise.resolve()
      },
    })

    expect({result, calls}).toEqual({
      result: 'typed',
      calls: ['attempt 1', 'restart', 'attempt 2'],
    })
  })

  test('a second driver fault is not retried again', async () => {
    const calls: string[] = []

    await expect(
      withDriverRetry({
        name: 'ja-typing',
        attempt: (attempt) => {
          calls.push(`attempt ${attempt}`)
          return Promise.reject(new Error(`mistap ${attempt}`))
        },
        restart: () => {
          calls.push('restart')
          return Promise.resolve()
        },
      }),
    ).rejects.toThrow('mistap 2')
    expect(calls).toEqual(['attempt 1', 'restart', 'attempt 2'])
  })

  test('a fault is not retried while an earlier process may still touch the device', async () => {
    const calls: string[] = []

    await expect(
      withDriverRetry({
        name: 'ja-typing',
        attempt: (attempt) => {
          calls.push(`attempt ${attempt}`)
          return Promise.reject(
            new Error('adb shell input text still runs after SIGKILL'),
          )
        },
        restart: () => {
          calls.push('restart')
          return Promise.resolve()
        },
        canRetry: () => false,
      }),
    ).rejects.toThrow('adb shell input text still runs after SIGKILL')
    expect(calls).toEqual(['attempt 1'])
  })

  test('a wrong editor result is returned once and never retried', async () => {
    const calls: string[] = []

    const typed = await withDriverRetry({
      name: 'ja-typing',
      attempt: (attempt) => {
        calls.push(`attempt ${attempt}`)
        return Promise.resolve({text: 'ｋ用今日', nested: 1})
      },
      restart: () => {
        calls.push('restart')
        return Promise.resolve()
      },
    })

    expect({typed, calls}).toEqual({
      typed: {text: 'ｋ用今日', nested: 1},
      calls: ['attempt 1'],
    })
  })
})

describe(typeOnDevice.name, () => {
  test('stops a hung failure dump before the retry starts', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/retried-typing.ts',
        setupFiles: ['src/fixtures/suites/dump-hangs.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {name: 'Scenario: Typing kyou after a driver fault', state: 'passed'},
      ],
    })
  }, 30_000)
})

describe('a digit in the typed text', () => {
  test('retries an attempt whose text holds a digit the inputs do not, and returns a digit the prefix holds', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/typing-with-long-press-digit.ts',
        setupFiles: ['src/fixtures/suites/device-types-digit-once.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A long press types a digit on the first attempt',
          state: 'passed',
        },
        {
          name: 'Scenario: A digit the prefix already holds is an editor result',
          state: 'passed',
        },
        {
          name: 'Scenario: A digit on both attempts fails the test as a driver fault',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('an exception in the page', () => {
  test('ends the call without a retry and fails the file of a test.fails test with the exception', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/page-throws-in-empty-block.ts',
        setupFiles: [
          'src/fixtures/suites/page-throws-once.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The page threw while the driver typed, which can be an editor failure, so it is not retried: "Scenario: The editor throws while kyou is typed into an empty block": Uncaught in `window.__state()`: Error: getSnapshot failed.',
      ],
      tests: [
        {
          name: 'Scenario: The editor throws while kyou is typed into an empty block',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('an adb process that outlives SIGKILL', () => {
  test('stops the call before the retry when it is left by the Chrome restart, and fails the file', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/chrome-restart-outlives-sigkill.ts',
        setupFiles: [
          'src/fixtures/suites/adb-outlives-sigkill-once.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'adb shell am force-stop com.android.chrome (pid 4242) outlived SIGKILL and may still have touched the device during later tests, so no result in this file can be trusted.',
      ],
      tests: [
        {
          name: 'Scenario: Stopping Chrome for the retry leaves an adb process that outlives SIGKILL',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('fails the file of a test.fails test when it is left by the final cleanup, and stops every later call', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/cleanup-outlives-sigkill.ts',
        setupFiles: [
          'src/fixtures/suites/adb-outlives-sigkill-once.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'adb shell am force-stop com.android.chrome (pid 4242) outlived SIGKILL and may still have touched the device during later tests, so no result in this file can be trusted.',
      ],
      tests: [
        {
          name: 'Scenario: Stopping Chrome after typing leaves an adb process that outlives SIGKILL',
          state: 'passed',
        },
        {name: 'Scenario: The next test types nothing', state: 'passed'},
      ],
    })
  }, 30_000)
})

describe('a test.fails device test with the device setup file', () => {
  test('fails its file when the test times out while the driver still types', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'src/fixtures/suites/typing-hangs.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 1_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver never returned a result and cleaned up in "Scenario: Typing kyou into an empty block", the test timed out or its cleanup failed. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {name: 'Scenario: Typing kyou into an empty block', state: 'passed'},
      ],
    })
  }, 30_000)

  test('fails its file when stopping Chrome after typing hangs until the test times out', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'src/fixtures/suites/chrome-stop-hangs.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 1_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver never returned a result and cleaned up in "Scenario: Typing kyou into an empty block", the test timed out or its cleanup failed. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {name: 'Scenario: Typing kyou into an empty block', state: 'passed'},
      ],
    })
  }, 30_000)

  test('fails its file when the test times out and Chrome finishes stopping during the next test', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/timeout-then-late-cleanup.ts',
        setupFiles: [
          'src/fixtures/suites/chrome-stop-finishes-late.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver never returned a result and cleaned up in "Scenario: Typing kyou into an empty block times out while Chrome stops", the test timed out or its cleanup failed. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou into an empty block times out while Chrome stops',
          state: 'passed',
        },
        {
          name: 'Scenario: Chrome finishes stopping during the next test',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('fails its file when the driver faults on both attempts', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'src/fixtures/suites/typing-faults-twice.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver ended on a driver fault in "Scenario: Typing kyou into an empty block". These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {name: 'Scenario: Typing kyou into an empty block', state: 'passed'},
      ],
    })
  }, 30_000)

  test('counts a failed editor assertion after a recovered driver fault as the expected failure', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'src/fixtures/suites/typing-faults-once.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {name: 'Scenario: Typing kyou into an empty block', state: 'passed'},
      ],
    })
  }, 30_000)

  test('counts a failed editor assertion as the expected failure, and fails a plain test with the same result', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/empty-block-and-existing-text.ts',
        setupFiles: [
          'src/fixtures/suites/typing-loses-first-character.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {name: 'Scenario: Typing kyou into an empty block', state: 'passed'},
        {name: 'Scenario: Typing kyou after existing text', state: 'failed'},
      ],
    })
  }, 30_000)
})

describe(runOnDevice.name, () => {
  test('retries a driver fault the way `typeOnDevice` does, and skips a case with a step Gboard cannot drive before the device', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/retried-run.ts',
        setupFiles: ['src/fixtures/suites/run-faults-once.ts'],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A call without the test context throws before its steps are checked',
          state: 'passed',
        },
        {
          name: 'Scenario: A call with its options first throws before its steps are checked',
          state: 'passed',
        },
        {
          name: 'Scenario: Pressing Enter after a driver fault',
          state: 'passed',
        },
        {
          name: 'Scenario: A candidate on the English keyboard is unsupported and never reaches the device',
          state: 'skipped',
          note: "Gboard cannot drive step 1 (compose): committing with a candidate needs keyboard 'ja', Gboard's English layout shows no conversion candidates",
        },
        {
          name: 'Scenario: Letters without a key, after a step Gboard drives, are unsupported and never reach the device',
          state: 'skipped',
          note: "Gboard cannot drive step 2 (compose): '💥' has no key on Gboard's letter page, which only maps a to z",
        },
        {
          name: 'Scenario: An empty slot before a step Gboard drives is unsupported and never reaches the device',
          state: 'skipped',
          note: 'Gboard cannot drive step 1: None is not a step',
        },
        {
          name: 'Scenario: The device saw only the case Gboard can drive',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test("fails a case whose step fails on both attempts with the last attempt's step records in its error", async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-steps.ts',
        setupFiles: ['src/fixtures/suites/run-step-faults.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Backspace, Enter and Backspace fail before any input, then on Enter in the retry',
          state: 'passed',
        },
        {
          name: 'Scenario: Enter fails before the first step on both attempts',
          state: 'passed',
        },
        {
          name: 'Scenario: The page throws after Backspace, ending the call without a retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A step error thrown again before the first step of the retry is unchanged',
          state: 'passed',
        },
        {
          name: 'Scenario: An error thrown by a step in two calls carries only the records of each call',
          state: 'passed',
        },
        {
          name: 'Scenario: A frozen step error is the cause of the error with the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws a string fails with the string and the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws a value whose `toString` throws fails with that value as the cause',
          state: 'passed',
        },
        {
          name: 'Scenario: A step error whose `message` getter throws is the cause of the error with the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step error whose `message` is an object whose `toString` throws is the cause of the error with the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step error whose `message` is a Symbol fails with its description and the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws NaN fails with NaN and the records',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws a revoked Proxy is retried as a driver fault',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws a revoked Proxy after input fails with the Proxy as the cause',
          state: 'passed',
        },
        {
          name: 'Scenario: An abort reason whose `toString` throws is the error of a call aborted during the retry',
          state: 'passed',
        },
        {
          name: 'Scenario: An abort reason whose `message` is a Symbol is the error of a call aborted during the retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A step whose `toJSON` throws fails with the step error and the records',
          state: 'passed',
        },
        {
          name: 'Scenario: The page throws after a step whose `toJSON` throws, ending the call without a retry',
          state: 'passed',
        },
        {
          name: 'Scenario: The page throws after a step whose `toJSON` throws only once, and the call is not retried into a success',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('skips only the concurrent test that called it with a case Gboard cannot drive', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/concurrent-unsupported.ts',
        setupFiles: ['src/vitest/setup.ts'],
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: An unsupported case in a concurrent test skips that test',
          state: 'skipped',
          note: "Gboard cannot drive step 1 (compose): '💥' has no key on Gboard's letter page, which only maps a to z",
        },
        {
          name: 'Scenario: A concurrent test fails its own assertion',
          state: 'failed',
        },
      ],
    })
  }, 30_000)

  test('drives the calls of two concurrent tests one at a time, each under its own test', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/concurrent-runs.ts',
        setupFiles: [
          'src/fixtures/suites/run-records-attempts.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter in a concurrent test',
          state: 'passed',
        },
        {
          name: 'Scenario: Pressing Backspace in a concurrent test',
          state: 'passed',
        },
        {
          name: 'Scenario: Each call drove the device on its own, under its own test',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('never skips the next test for an unsupported case reached after its own test timed out, and fails the file of that test.fails test', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/late-unsupported.ts',
        setupFiles: ['src/vitest/setup.ts'],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver never returned a result and cleaned up in "Scenario: An unsupported case reached after the test timed out", the test timed out or its cleanup failed. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {
          name: 'Scenario: An unsupported case reached after the test timed out',
          state: 'passed',
        },
        {
          name: 'Scenario: The next test fails its own assertion',
          state: 'failed',
        },
      ],
    })
  }, 30_000)

  test('never drives the device for a case reached after its own test timed out, and records it against that test', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/late-supported.ts',
        setupFiles: [
          'src/fixtures/suites/run-records-attempts.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver never returned a result and cleaned up in "Scenario: A case reached after the test timed out", the test timed out or its cleanup failed. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {
          name: 'Scenario: A case reached after the test timed out',
          state: 'passed',
        },
        {
          name: 'Scenario: The next test sees no device call and no run of its own',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('fails the file of a test.fails test whose run faults on both attempts', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-run.ts',
        setupFiles: [
          'src/fixtures/suites/run-faults-twice.ts',
          'src/vitest/setup.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver ended on a driver fault in "Scenario: Pressing Enter in an empty block". These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {name: 'Scenario: Pressing Enter in an empty block', state: 'passed'},
      ],
    })
  }, 30_000)
})

describe('the retry of a `runOnDevice` call', () => {
  test('runs only in a Chrome proven new, never after input, and never once adb lost the device', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/run-retry-policy.ts',
        setupFiles: ['src/fixtures/suites/gboard-device.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A fault before any input is retried once the old Chrome stopped and the new one runs in another process',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault before any input is not retried when the old Chrome still runs after the force-stop',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault before any input is not retried when the relaunched Chrome runs in the old process',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault before any input is not retried when the pid of the old Chrome cannot be read',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault after a key tap is inconclusive and never retried, and keeps its error and records',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault right after a Delete tap is inconclusive, since Delete changes the field',
          state: 'passed',
        },
        {
          name: 'Scenario: A key tap whose reply was rejected counts as sent input, so its fault is never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A key tap the device never answers counts as sent input, so the attempt timing out is never retried',
          state: 'passed',
        },
        {
          name: "Scenario: An adb call that fails on adb's error for a lost device ends the call device offline without a retry",
          state: 'passed',
        },
        {
          name: "Scenario: A tap the adb server answers with `FAIL device offline` ends the call device offline, like the CLI's error",
          state: 'passed',
        },
        {
          name: 'Scenario: A tap whose socket to the adb server closed is no lost device, and after input it ends the call inconclusive',
          state: 'passed',
        },
        {
          name: "Scenario: The pid read failing on adb's error for a lost device ends the call device offline",
          state: 'passed',
        },
        {
          name: "Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline before the restart reads a pid again, while the old Chrome still runs",
          state: 'passed',
        },
        {
          name: "Scenario: A force-stop that fails on adb's error for a lost device ends the call device offline, though later pid reads would show a fresh Chrome",
          state: 'passed',
        },
        {
          name: "Scenario: adb's lost-device error while uiautomator2 starts ends the call device offline at once, without polling it again or retrying",
          state: 'passed',
        },
        {
          name: 'Scenario: An ordinary error while uiautomator2 starts is polled again, and the call completes',
          state: 'passed',
        },
        {
          name: "Scenario: adb's lost-device error while the page loads over CDP ends the call device offline at once, without polling it again or retrying",
          state: 'passed',
        },
        {
          name: 'Scenario: An ordinary error while the page loads over CDP is polled again, and the call completes',
          state: 'passed',
        },
        {
          name: "Scenario: adb's CLI error for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline",
          state: 'passed',
        },
        {
          name: "Scenario: The adb server's wrapped `FAIL` for a lost device that a helper recognised is never read again, so a message that throws on its second read still ends the call device offline",
          state: 'passed',
        },
        {
          name: "Scenario: A step whose adb call adb's CLI lost the device on fails with that error as its cause and in its record, not the driver's own recognition of it",
          state: 'passed',
        },
        {
          name: "Scenario: A step whose adb call the adb server's `FAIL` lost the device on fails with that error as its cause and in its record, not the driver's own recognition of it",
          state: 'passed',
        },
        {
          name: "Scenario: The wait for uiautomator2 passes on a lost device a helper below it already recognised, never reading adb's error again",
          state: 'passed',
        },
        {
          name: "Scenario: The wait for the page over CDP passes on a lost device a helper below it already recognised, never reading adb's error again",
          state: 'passed',
        },
        {
          name: "Scenario: A `typeOnDevice` call a `runOnDevice` step queues keeps its own retry, so adb's lost-device error while uiautomator2 starts is polled through and the call completes",
          state: 'passed',
        },
        {
          name: "Scenario: A `runOnDevice` call a `typeOnDevice` word queues is strict for its own attempt, so adb's lost-device error while uiautomator2 starts ends it device offline",
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out and an `adb get-state` that answers offline end the call device offline',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out while `adb get-state` answers device on stdout is inconclusive and marked answered, whatever adb wrote on stderr',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out and an `adb get-state` that never answers is inconclusive and marked unconfirmed, never device offline',
          state: 'passed',
        },
        {
          name: 'Scenario: Two timeouts before any input read `adb get-state` once in the call',
          state: 'passed',
        },
        {
          name: 'Scenario: The state read answers only the failure it was read for, so a later timeout in the call is unconfirmed',
          state: 'passed',
        },
        {
          name: 'Scenario: A later failure that throws the same error object as the timeout the state read answered is unconfirmed',
          state: 'passed',
        },
        {
          name: 'Scenario: A step that throws the same error on both attempts is unconfirmed on the second, whose failure the state read never answered',
          state: 'passed',
        },
        {
          name: "Scenario: adb's CLI error for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input",
          state: 'passed',
        },
        {
          name: "Scenario: The adb server's wrapped `FAIL` for a lost device is read once to classify and quote it, so a message that throws when read again cannot reopen a retry after input",
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('the step records of a `runOnDevice` call', () => {
  test("hold the field's focus, read the page back into a failed step, fail a candidate Gboard does not offer, and type '- ' on the symbol layouts", async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/run-step-records.ts',
        setupFiles: ['src/fixtures/suites/gboard-device.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: "Scenario: Each step's record holds whether the field has focus, read in the same evaluation as its text and selection",
          state: 'passed',
        },
        {
          name: "Scenario: After a step fails, the page's text, selection and focus are read into its record, and the error is the step's",
          state: 'passed',
        },
        {
          name: "Scenario: The page is read into the failed step's record after the attempt timed out, on a clock of its own",
          state: 'passed',
        },
        {
          name: "Scenario: A read after the failed step that does not answer leaves its text, selection and focus unread, and the error is the step's",
          state: 'passed',
        },
        {
          name: "Scenario: A failed step read back before the test's deadline ends the call inconclusive",
          state: 'passed',
        },
        {
          name: "Scenario: A failed step whose read back is still running at the test's deadline ends the call inconclusive, and the read is stopped",
          state: 'passed',
        },
        {
          name: "Scenario: The test's deadline during a step that still runs ends the call aborted",
          state: 'passed',
        },
        {
          name: "Scenario: A tap that times out after input, with the state read answered before the test's deadline, ends the call inconclusive and answered",
          state: 'passed',
        },
        {
          name: "Scenario: A tap that times out after input, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed",
          state: 'passed',
        },
        {
          name: "Scenario: A pid read that times out, with the state read answered before the test's deadline, ends the call inconclusive and answered",
          state: 'passed',
        },
        {
          name: "Scenario: A pid read that times out, with the state read still running at the test's deadline, ends the call inconclusive and unconfirmed",
          state: 'passed',
        },
        {
          name: "Scenario: A rejected tap after input, with the failure dump done before the test's deadline, ends the call inconclusive",
          state: 'passed',
        },
        {
          name: "Scenario: A rejected tap after input, with the failure dump still running at the test's deadline, ends the call inconclusive",
          state: 'passed',
        },
        {
          name: "Scenario: An exception in the page, with the read of the page done before the test's deadline, ends the call on the page's exception",
          state: 'passed',
        },
        {
          name: "Scenario: An exception in the page, with the read of the page still running at the test's deadline, ends the call on the page's exception",
          state: 'passed',
        },
        {
          name: 'Scenario: The outcome of a failed attempt is recorded before any diagnostic, so one that never answers changes nothing',
          state: 'passed',
        },
        {
          name: "Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the state read hanging at the test's deadline",
          state: 'passed',
        },
        {
          name: "Scenario: A tap that fails on adb's error for a lost device, from adb's CLI, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline",
          state: 'passed',
        },
        {
          name: "Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the state read hanging at the test's deadline",
          state: 'passed',
        },
        {
          name: "Scenario: A tap that fails on adb's error for a lost device, from the adb server's `FAIL`, ends the call device offline from that error alone, with the failure dump hanging at the test's deadline",
          state: 'passed',
        },
        {
          name: "Scenario: A timeout before any input, with the state read still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed",
          state: 'passed',
        },
        {
          name: "Scenario: A timeout before any input, with the failure dump still running at the test's deadline before the retry, ends the call inconclusive and unconfirmed",
          state: 'passed',
        },
        {
          name: "Scenario: A timeout before any input, with the state read answering device before the test's deadline, retries, and the deadline during the retry's restart ends the call aborted",
          state: 'passed',
        },
        {
          name: "Scenario: A timeout before any input, with the state read answering offline before the test's deadline, ends the call device offline",
          state: 'passed',
        },
        {
          name: "Scenario: A rejected tap before any input, with the failure dump still running at the test's deadline before the retry, ends the call on a driver fault",
          state: 'passed',
        },
        {
          name: "Scenario: A retry that refuses a Chrome that did not restart still ends the call on the first attempt's step records",
          state: 'passed',
        },
        {
          name: "Scenario: A retry whose own step fails ends the call on its own step records, not the first attempt's",
          state: 'passed',
        },
        {
          name: "Scenario: A rejected tap before any input, with the failure dump done before the test's deadline, is retried and the call completes",
          state: 'passed',
        },
        {
          name: "Scenario: A test deadline that reading adb's lost-device error itself aborts still ends the call device offline, since the failure was already being classified",
          state: 'passed',
        },
        {
          name: 'Scenario: A test deadline that reading a pre-input timeout itself aborts ends the call inconclusive and unconfirmed, since the failure was already being classified',
          state: 'passed',
        },
        {
          name: 'Scenario: No diagnostic read sits between two inputs',
          state: 'passed',
        },
        {
          name: 'Scenario: A candidate Gboard offers is tapped',
          state: 'passed',
        },
        {
          name: 'Scenario: A candidate Gboard does not offer fails the step instead of committing with Space',
          state: 'passed',
        },
        {
          name: "Scenario: '- ' in English text is typed on Gboard's symbol layout, which the step leaves for the letters again",
          state: 'passed',
        },
        {
          name: "Scenario: ' -' in English text is typed in its order, reopening the symbol layout for the dash after a space, since Space returns Gboard to the letters",
          state: 'passed',
        },
        {
          name: "Scenario: '- ' in Japanese text is typed through the alphabet layout, the numeric pad and its 記号キーボード, which the step leaves for romaji again",
          state: 'passed',
        },
        {
          name: "Scenario: ' -' in Japanese text is typed in its order, reopening 記号キーボード from the numeric pad for each dash after a space, and the step ends on romaji",
          state: 'passed',
        },
        {
          name: "Scenario: '- -' in Japanese text is typed in its order, reopening 記号キーボード from the numeric pad for each dash after a space, and the step ends on romaji",
          state: 'passed',
        },
        {
          name: "Scenario: '-  ' in Japanese text types both spaces on the numeric pad after the dash, and the step ends on romaji",
          state: 'passed',
        },
        {
          name: "Scenario: ' ' in Japanese text is tapped on the numeric pad even when the dump after 数字キーボード still shows the alphabet layout",
          state: 'passed',
        },
        {
          name: "Scenario: ' ' in English text is tapped on the symbol layout even when the dump after Symbol keyboard still shows the letters",
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('a `typeOnDevice` call', () => {
  test('commits a candidate Gboard does not offer with Space, and retries a fault after input in a restarted Chrome', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/typing-keeps-its-outcomes.ts',
        setupFiles: ['src/fixtures/suites/gboard-device.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A candidate Gboard does not offer is committed with Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A fault after a key tap is retried in a restarted Chrome without a pid check',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('a page exception in the read of a failed step', () => {
  test('ends the call on it before and after input and on the retry, and fails the file', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/readback-page-exception.ts',
        setupFiles: [
          'src/fixtures/suites/gboard-device.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The page threw while the driver typed, which can be an editor failure, so it is not retried: "Scenario: A page exception in the read of a step that failed before input ends the call on it": Uncaught in `window.__state()`: Error: getSnapshot failed, "Scenario: A page exception in the read of a step that failed on the retry ends the call on it": Uncaught in `window.__state()`: Error: getSnapshot failed, "Scenario: A page exception in the read of a step that failed after input ends the call on it, not inconclusive": Uncaught in `window.__state()`: Error: getSnapshot failed.',
      ],
      tests: [
        {
          name: 'Scenario: A page exception in the read of a step that failed before input ends the call on it',
          state: 'passed',
        },
        {
          name: 'Scenario: A page exception in the read of a step that failed on the retry ends the call on it',
          state: 'passed',
        },
        {
          name: 'Scenario: A page exception in the read of a step that failed after input ends the call on it, not inconclusive',
          state: 'passed',
        },
        {
          name: 'Scenario: Another error in the read of a failed step stays a diagnostic, and the call still retries',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('a test.fails `runOnDevice` test with the device setup file', () => {
  test('fails its file when its call ended inconclusive or with the device offline', async () => {
    expect(
      await runSuite({
        root,
        file: 'src/fixtures/suites/failing-run-outcomes.ts',
        setupFiles: [
          'src/fixtures/suites/gboard-device.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'In "Scenario: Backspace and Enter after foo" the driver ended inconclusive: the driver faulted after it sent input, so it was not retried. In "Scenario: Enter after foo" adb lost the device, so it was not retried: adb shell dumpsys input_method exited with 1: error: device offline. These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {name: 'Scenario: Backspace and Enter after foo', state: 'passed'},
        {name: 'Scenario: Enter after foo', state: 'passed'},
      ],
    })
  }, 60_000)
})

describe('the job summary', () => {
  test("counts each test of the file by its result and its last driver call's outcome, with the undercount notes", async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'thumbjar-summary-')),
      'summary.md',
    )
    vi.stubEnv('GITHUB_STEP_SUMMARY', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        root,
        file: 'src/fixtures/suites/every-outcome.ts',
        setupFiles: [
          'src/fixtures/suites/gboard-device.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'failed',
        errors: [],
        tests: [
          {name: 'Scenario: Passed', state: 'passed'},
          {name: 'Scenario: Failed', state: 'failed'},
          {name: 'Scenario: Expected failure', state: 'passed'},
          {name: 'Scenario: Inconclusive after input', state: 'failed'},
          {name: 'Scenario: Device offline', state: 'failed'},
          {name: 'Scenario: Driver fault', state: 'failed'},
          {
            name: 'Scenario: Inconclusive while the device answered',
            state: 'failed',
          },
          {
            name: 'Scenario: Inconclusive while the device was not checked',
            state: 'failed',
          },
          {name: 'Scenario: Passed without a driver call', state: 'passed'},
          {
            name: 'Scenario: Passed on its last call after a driver fault',
            state: 'passed',
          },
          {name: 'Scenario: Passed in a group', state: 'passed'},
          {name: 'Scenario: Expected failure in a group', state: 'passed'},
          {name: 'Scenario: Passed in a group', state: 'failed'},
          {name: 'Scenario: Skipped', state: 'skipped'},
          {name: 'Scenario: Todo', state: 'skipped'},
          {
            name: 'Scenario: A case Gboard cannot drive',
            state: 'skipped',
            note: "Gboard cannot drive step 1 (compose): '💥' has no key on Gboard's letter page, which only maps a to z",
          },
        ],
      },
      summary: [
        '`src/fixtures/suites/every-outcome.ts`: 4 passed ("Scenario: Passed", "Scenario: Passed without a driver call", "Scenario: Passed on its last call after a driver fault", "Scenario: Passed in a group"), 1 failed ("Scenario: Failed"), 2 expected failure ("Scenario: Expected failure", "Scenario: Expected failure in a group"), 4 inconclusive ("Scenario: Inconclusive after input", "Scenario: Inconclusive while the device answered", "Scenario: Inconclusive while the device was not checked", "Scenario: Passed in a group"), 1 device offline ("Scenario: Device offline"), 1 driver fault ("Scenario: Driver fault")',
        '',
        '3 not run, skipped or todo ("Scenario: Skipped", "Scenario: Todo", "Scenario: A case Gboard cannot drive")',
        '',
        'Not counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.',
        '',
        'Could not check whether the device was reachable, so the device offline count can be too low.',
        '',
        'Taps sent and page events for "Scenario: Failed":\n  step 1: sent Enter\n          page (none)',
        '',
        'Taps sent and page events for "Scenario: Inconclusive after input":\n  step 1: sent Enter\n          page (none)',
        '',
        'Taps sent and page events for "Scenario: Passed in a group":\n  step 1: sent Enter\n          page (none)',
        '',
      ].join('\n'),
    })
  }, 60_000)

  test('leaves skipped, todo and runtime-skipped tests out of the counts and lists them on their own line, and counts a retried and two same-named tests by their own results', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'thumbjar-summary-')),
      'summary.md',
    )
    vi.stubEnv('GITHUB_STEP_SUMMARY', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        root,
        file: 'src/fixtures/suites/nested-outcomes.ts',
        setupFiles: [
          'src/fixtures/suites/gboard-device.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'passed',
        errors: [],
        tests: [
          {name: 'Scenario: Passed', state: 'passed'},
          {name: 'Scenario: Expected failure', state: 'passed'},
          {name: 'Scenario: Skipped', state: 'skipped'},
          {name: 'Scenario: Todo', state: 'skipped'},
          {
            name: 'Scenario: Skipped as it runs',
            state: 'skipped',
            note: 'unsupported',
          },
          {name: 'Scenario: Passed on its retry', state: 'passed'},
          {name: 'Scenario: Same name', state: 'passed'},
          {name: 'Scenario: Same name', state: 'passed'},
        ],
      },
      summary: [
        '`src/fixtures/suites/nested-outcomes.ts`: 3 passed ("Scenario: Passed", "Scenario: Passed on its retry", "Scenario: Same name"), 0 failed, 1 expected failure ("Scenario: Expected failure"), 1 inconclusive ("Scenario: Same name"), 0 device offline, 0 driver fault',
        '',
        '3 not run, skipped or todo ("Scenario: Skipped", "Scenario: Todo", "Scenario: Skipped as it runs")',
        '',
      ].join('\n'),
    })
  }, 60_000)
})

describe('the taps a failed test prints', () => {
  test('are printed at the end of the file for each test that ends failed, and for no other', async () => {
    const captured = join(
      mkdtempSync(join(tmpdir(), 'thumbjar-stderr-')),
      'stderr.txt',
    )
    writeFileSync(captured, '')
    vi.stubEnv('THUMBJAR_CAPTURED_STDERR', captured)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        root,
        file: 'src/fixtures/suites/taps-print-on-final-state.ts',
        setupFiles: [
          'src/fixtures/suites/gboard-device.ts',
          'src/fixtures/suites/capture-stderr.ts',
          'src/vitest/setup.ts',
        ],
        testTimeout: 15_000,
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, stderr: readFileSync(captured, 'utf8')}).toEqual({
      result: {
        file: 'failed',
        errors: [],
        tests: [
          {name: 'Scenario: Ordinary failure', state: 'failed'},
          {name: 'Scenario: Expected failure', state: 'passed'},
          {name: 'Scenario: Unexpected pass', state: 'failed'},
        ],
      },
      stderr: [
        'Taps sent and page events for "Scenario: Ordinary failure":\n  step 1: sent Enter\n          page (none)',
        'Taps sent and page events for "Scenario: Unexpected pass":\n  step 1: sent Enter\n          page (none)',
        '',
      ].join('\n'),
    })
  }, 60_000)
})
