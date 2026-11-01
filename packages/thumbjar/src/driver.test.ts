import {fileURLToPath} from 'node:url'
import {describe, expect, test} from 'vitest'
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
          name: 'Scenario: Backspace, Enter and Backspace fail on both attempts',
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
          name: 'Scenario: A step that throws a revoked Proxy on both attempts fails with the Proxy as the cause',
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
