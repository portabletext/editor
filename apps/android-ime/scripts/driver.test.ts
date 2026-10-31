import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, test, vi} from 'vitest'
import {typeOnDevice, withDriverRetry} from './driver.ts'
import {runSuite} from './fixtures/run-suite.ts'

describe(withDriverRetry.name, () => {
  test('a driver fault restarts and types once more', async () => {
    const calls: string[] = []

    const result = await withDriverRetry({
      name: 'ja-typing',
      attempt: async (attempt) => {
        calls.push(`attempt ${attempt}`)
        if (attempt === 1) throw new Error('Gboard window did not appear')
        return 'typed'
      },
      restart: async () => {
        calls.push('restart')
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
        attempt: async (attempt) => {
          calls.push(`attempt ${attempt}`)
          throw new Error(`mistap ${attempt}`)
        },
        restart: async () => {
          calls.push('restart')
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
        attempt: async (attempt) => {
          calls.push(`attempt ${attempt}`)
          throw new Error('adb shell input text still runs after SIGKILL')
        },
        restart: async () => {
          calls.push('restart')
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
      attempt: async (attempt) => {
        calls.push(`attempt ${attempt}`)
        return {text: 'ｋ用今日', nested: 1}
      },
      restart: async () => {
        calls.push('restart')
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
        file: 'scripts/fixtures/suites/retried-typing.ts',
        setupFiles: ['scripts/fixtures/suites/dump-hangs.ts'],
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
        file: 'scripts/fixtures/suites/typing-with-long-press-digit.ts',
        setupFiles: ['scripts/fixtures/suites/device-types-digit-once.ts'],
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
        file: 'scripts/fixtures/suites/page-throws-in-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-throws-once.ts',
          'tests/setup.ts',
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

describe('an error the page records', () => {
  test('reaches the result without a retry, and a page that records none gives no errors', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/page-error-is-a-result.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-records-errors.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: An error the page already recorded before Enter ends a crash case there',
          state: 'passed',
        },
        {
          name: 'Scenario: A page without errors or blocks in its state',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('an error the page records while typing', () => {
  test('ends the attempt as its result, after a driver fault in a crash case ends the call on a fault with the error, never retried, and retries any other call as before', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/page-error-stops-typing.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: An error after word 1 ends the attempt of a crash case before a missing candidate on word 2 can be retried',
          state: 'passed',
        },
        {
          name: 'Scenario: An error the page shows only after a missing required candidate ends a crash case on a fault with the error, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: An error the page shows only after Gboard vanished ends a crash case on a fault with the error, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A driver fault on a page without errors is still retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A required candidate missing on the retry of a crash case with an error on the read after that fault ends on a fault with the error',
          state: 'passed',
        },
        {
          name: 'Scenario: A rejected tap with an error on the read after it ends a crash case on a fault with the error, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A missing required candidate with an unrelated page error ends a crash case on a fault with the error, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: An error the page recorded on Enter stays the result when the tap back to the letters then hangs, never retried',
          state: 'passed',
        },
        {
          name: "Scenario: An error other than the case's crash stays a fault with the error when the tap back to the letters then hangs, never retried",
          state: 'passed',
        },
        {
          name: 'Scenario: A driver fault on a page without errors is still retried when the tap back to the letters then hangs',
          state: 'passed',
        },
        {
          name: "Scenario: A crash case's error the page recorded on Enter stays the result when the screenshot after Enter then hangs until the attempt deadline, never retried",
          state: 'passed',
        },
        {
          name: 'Scenario: A screenshot after Enter and the read after it that both hang end a crash case inconclusive, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A dump that hangs before any key is tapped is retried without a crash',
          state: 'passed',
        },
        {
          name: 'Scenario: A rejected Enter that still reaches the page after a read without errors ends a crash case inconclusive, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A driver fault after the first letter on a page without errors ends a crash case inconclusive, never retried',
          state: 'passed',
        },
        {
          name: 'Scenario: A dump that hangs before any key is tapped is retried for a crash case',
          state: 'passed',
        },
        {
          name: 'Scenario: A rejected Enter that still reaches the page later is retried without a crash',
          state: 'passed',
        },
        {
          name: 'Scenario: A dropped CDP connection after the first letter is retried without a crash, as it was before the read after a fault',
          state: 'passed',
        },
        {
          name: 'Scenario: An error the page records stops no call without a crash, which types every word and returns it with the result',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('an adb process that outlives SIGKILL', () => {
  test('stops the call before the retry when it is left by the Chrome restart, and fails the file', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/chrome-restart-outlives-sigkill.ts',
        setupFiles: [
          'scripts/fixtures/suites/adb-outlives-sigkill-once.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/cleanup-outlives-sigkill.ts',
        setupFiles: [
          'scripts/fixtures/suites/adb-outlives-sigkill-once.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-hangs.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/chrome-stop-hangs.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/timeout-then-late-cleanup.ts',
        setupFiles: [
          'scripts/fixtures/suites/chrome-stop-finishes-late.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-faults-twice.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-faults-once.ts',
          'tests/setup.ts',
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
        file: 'scripts/fixtures/suites/empty-block-and-existing-text.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-loses-first-character.ts',
          'tests/setup.ts',
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

describe('symbols in the letters', () => {
  test('are tapped on the layout that has them, by label, with the incomplete-dump check and the retry', async () => {
    const result = await runSuite({
      file: 'scripts/fixtures/suites/typing-symbols.ts',
      setupFiles: [
        'scripts/fixtures/suites/gboard-with-layouts.ts',
        'tests/setup.ts',
      ],
      testTimeout: 15_000,
    })

    expect(result).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing "- " on English switches to the symbol layout and presses Enter there',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Japanese QWERTY goes from romaji past the alphabet layout and the numeric pad to its symbols for a dash key, and back to romaji after Enter',
          state: 'passed',
        },
        {
          name: 'Scenario: A letter after a symbol waits for the letter layout again',
          state: 'passed',
        },
        {
          name: 'Scenario: Dumps of the old layout and of a half-drawn symbol layout are dumped again',
          state: 'passed',
        },
        {
          name: 'Scenario: A rejected tap on a symbol key is a driver fault and is typed again',
          state: 'passed',
        },
        {
          name: 'Scenario: A symbol no layout shows is a driver fault on both attempts naming each layout dump, never another key',
          state: 'passed',
        },
        {
          name: 'Scenario: No ダッシュ cell on the rich symbol panel 記号キーボード opens is a driver fault before any input naming its labels and its dump, and Gboard is back on romaji for the retry',
          state: 'passed',
        },
        {
          name: 'Scenario: The emoji and media panel opened by 記号キーボード is a driver fault before any input naming its labels and saving its dump, with no cell or category tapped',
          state: 'passed',
        },
        {
          name: 'Scenario: Half-drawn dumps of the Japanese numeric pad are dumped again, and the dash is typed past it',
          state: 'passed',
        },
        {
          name: 'Scenario: Half-drawn dumps of the Japanese numeric pad that never complete are a driver fault before 記号キーボード is tapped, and Gboard is back on romaji for the retry',
          state: 'passed',
        },
        {
          name: 'Scenario: The Japanese alphabet layout with its emoji key as the only other switch is a driver fault with the emoji key never tapped, and with no way back the retry finds no Japanese',
          state: 'passed',
        },
        {
          name: 'Scenario: A digit typed on the symbol layout is no mistap, ASCII or full width',
          state: 'passed',
        },
        {
          name: 'Scenario: A digit the letters do not hold after a symbol is still a mistap',
          state: 'passed',
        },
        {
          name: 'Scenario: A letter after a dash on the Japanese symbol layout waits for romaji',
          state: 'passed',
        },
        {
          name: 'Scenario: Half-drawn dumps of the symbol layout that never complete are a driver fault, with nothing typed on them and Gboard taken back to its letters',
          state: 'passed',
        },
        {
          name: 'Scenario: Dumps that keep showing the old layout after a switch are a driver fault, with nothing typed on them and Gboard taken back to its letters',
          state: 'passed',
        },
        {
          name: 'Scenario: Dumps of the symbol layout with only its Space, Enter, Delete and Dash keys are a driver fault, with nothing typed on them and Gboard taken back to its letters',
          state: 'passed',
        },
        {
          name: 'Scenario: Dumps that keep showing the old keys under a changing suggestion after a switch are a driver fault, with nothing typed on them and Gboard taken back to its letters',
          state: 'passed',
        },
        {
          name: 'Scenario: On the recorded rich symbol panel 記号キーボード opens, "- " is typed with its ダッシュ cell and Space on the pad, and Enter is pressed after the dash precondition',
          state: 'passed',
        },
        {
          name: 'Scenario: A ダッシュ cell that commits U+2014 ends the crash case inconclusive before Enter, naming the code point',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('a word Space commits as kana', () => {
  test('logs one KANA_FALLBACK line per call with a candidate, after the retry and with the result unchanged, and keeps the result when printing the line fails', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/typing-logs-kana-fallback.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Space commits word 1 as kana on the retry after a rejected tap',
          state: 'passed',
        },
        {
          name: 'Scenario: Gboard offers the candidate for both words',
          state: 'passed',
        },
        {name: 'Scenario: Words without a candidate', state: 'passed'},
        {name: 'Scenario: Printing the line throws', state: 'passed'},
      ],
    })
  }, 60_000)
})

describe('a required candidate', () => {
  test('is tapped when Gboard offers it on the retry, a candidate that is not required still falls back to Space, and one Space would commit first faults', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/typing-required-candidate.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A required candidate Gboard offers only on the retry is tapped there',
          state: 'passed',
        },
        {
          name: 'Scenario: A candidate that is not required falls back to Space as before',
          state: 'passed',
        },
        {
          name: 'Scenario: A required candidate after letters that end in a space faults before typing',
          state: 'passed',
        },
      ],
    })
  }, 60_000)

  test('missing on the retry of a crash case with an error on the read after the miss fails the file of a test.fails test with the error', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/required-candidate-missing-with-error.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou while 今日 is missing on the retry and the page records an error after the miss": Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右'], and the page recorded errors: ["NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou while 今日 is missing on the retry and the page records an error after the miss',
          state: 'passed',
        },
      ],
    })
  }, 60_000)

  test('missing on both attempts is a driver fault that fails the file of a test.fails test', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/required-candidate-missing.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
        ],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        'The driver ended on a driver fault in "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it". These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.',
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('the Chrome restart before a retry', () => {
  test('retries only once the old Chrome is gone and the retry runs in a new one, and otherwise ends the call inconclusive naming both pids or the adb timeout', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/retry-in-fresh-chrome.ts',
        setupFiles: ['scripts/fixtures/suites/gboard-with-layouts.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A force-stop that leaves the old Chrome running ends the call inconclusive, with no retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A force-stop that exits non-zero while Chrome still stops is retried in the new Chrome',
          state: 'passed',
        },
        {
          name: 'Scenario: A force-stop that times out while Chrome still stops is retried in the new Chrome, naming the adb timeout',
          state: 'passed',
        },
        {
          name: 'Scenario: A restart that stops Chrome is retried in the new Chrome',
          state: 'passed',
        },
        {
          name: 'Scenario: A restart that finds no Chrome running is retried in the one the retry launches',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out ends the call inconclusive, with no retry, naming the adb timeout',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('a device that adb lost in the Chrome restart before a retry', () => {
  test('ends the call inconclusive naming the device offline and its `adb get-state` for each adb transport error, and keeps the no-fresh-Chrome message for any other pid read failure', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/device-offline.ts',
        setupFiles: ['scripts/fixtures/suites/gboard-with-layouts.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A pid read that fails as `adb: device offline` names the device offline and its state',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that fails as `error: closed` after the force-stop names the device offline',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that finds no device names the device offline with the state adb gives',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out names the device offline and still the adb timeout',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that fails as `adb: device offline` counts as device offline even when `adb get-state` then answers `device`',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out while `adb get-state` answers `device` keeps the message that no fresh Chrome showed',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that times out while `adb get-state` times out too names the device offline and that error',
          state: 'passed',
        },
        {
          name: 'Scenario: A device offline whose `adb get-state` fails too names that error instead of a state',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that fails as `adb: device offline` after the relaunch names the device offline, and the retry taps nothing',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that fails on the device, not in adb, keeps the message that no fresh Chrome showed',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read after the relaunch that times out just before the attempt deadline keeps the message that no fresh Chrome showed and leaves the device unconfirmed when its `adb get-state` is stopped',
          state: 'passed',
        },
        {
          name: 'Scenario: A pid read that fails as `adb: device offline` still names the device offline when its `adb get-state` is stopped',
          state: 'passed',
        },
      ],
    })
  }, 60_000)

  test('leaves the device unconfirmed when the `adb get-state` after a timed-out pid read is stopped by its own deadline while adb closes', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/device-state-read-stopped.ts',
        setupFiles: [],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: An `adb get-state` after a pid read that timed out, stopped by its own deadline as adb closes, leaves the device unconfirmed',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('a dash in a crash case', () => {
  test('types on once the page logs the dash, and ends the call inconclusive with no retry when it does not, also when the dash lands later with the error and whether or not Chrome then exits', async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/typing-dash.ts',
        setupFiles: ['scripts/fixtures/suites/gboard-with-layouts.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A dash that reaches the page on the last read after its tap is typed on, and the call completes',
          state: 'passed',
        },
        {
          name: 'Scenario: A dash tap that never reaches the page ends the call inconclusive, with no retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A dash that reaches the page only on the read after the fault ends the call inconclusive, with no retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A dash that lands with the error only on the tap back to the letters, Chrome still running, ends the call inconclusive, with no retry',
          state: 'passed',
        },
        {
          name: 'Scenario: A dash that lands with the error only on the tap back to the letters, Chrome then exiting, ends the call inconclusive, with no retry',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('the Space that commits a word in an English crash case', () => {
  test("records whether Gboard's strip switched and whether it restarted its input from dumps the driver took anyway and reads after the final read, and when the page lacks the Space ends the call inconclusive whatever they show", async () => {
    expect(
      await runSuite({
        file: 'scripts/fixtures/suites/typing-checks-space.ts',
        setupFiles: ['scripts/fixtures/suites/gboard-with-layouts.ts'],
        testTimeout: 15_000,
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: A Space the page got records a strip that switched and no input restart, and sends the device nothing between the inputs that a call without a crash does not',
          state: 'passed',
        },
        {
          name: 'Scenario: A call without a crash sends the device the same calls between its inputs, and reads nothing after its final read',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks after a strip that switched with no input restart ends the call inconclusive once typing went on with the same input',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks after a strip that did not switch ends the call inconclusive, naming when the strip was read',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks whose dump before the next word is still on completions ends the call inconclusive naming that strip, though a later strip switched',
          state: 'passed',
        },
        {
          name: 'Scenario: A partial dump in the loop before the Space never feeds the strip, which comes from the whole dump the loop tapped from',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks whose dump after it does not parse leaves the strip unread and ends the call inconclusive',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks whose dump after it holds no whole keyboard leaves the strip unread and ends the call inconclusive',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks after a strip that switched across an input restart in its window ends the call inconclusive, naming the restart',
          state: 'passed',
        },
        {
          name: 'Scenario: A restart inside the pad before the dump before the Space counts, and ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A restart inside the pad after the dump after the Space counts, and ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks after a strip that switched from a snapshot older than its dump, with the restart that reset it 1.5 seconds before that dump, outside the pad, ends the call inconclusive',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space that never reached Gboard, after which the last dump returns a stale snapshot of predictions, ends the call inconclusive though the strip switched with no restart',
          state: 'passed',
        },
        {
          name: 'Scenario: A Space the page lacks, with a restart during the dump before it that a clock offset read 3 seconds low places outside its window, ends the call inconclusive',
          state: 'passed',
        },
        {
          name: 'Scenario: A read of logcat whose first line is not older than the padded window ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A read of logcat whose last line is not newer than the padded window ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A read of the device clock that fails leaves the restart unread and ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A read of the device clock whose shortest round trip is longer than the pad ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A read of logcat that adb fails ends the call inconclusive when the page lacks the Space',
          state: 'passed',
        },
        {
          name: 'Scenario: A Japanese call with a crash reads no strip, no clock and no logcat around the Space that commits a word as kana',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
})

describe('the read of logcat after the final read of an English crash case', () => {
  test('reads from the pad and 5 seconds before the first tap on the device clock, to the millisecond, leaves a rejected or empty read unread so the file counts the call inconclusive, and logs the read raw once', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'scripts/fixtures/suites/typing-reads-logcat-since.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'tests/setup.ts',
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
          {
            name: 'Scenario: adb rejects the time logcat reads from',
            state: 'passed',
          },
          {
            name: 'Scenario: logcat prints nothing from that time',
            state: 'passed',
          },
          {
            name: 'Scenario: The raw read is logged once a call, after its final read',
            state: 'passed',
          },
          {name: 'Scenario: Printing the raw read throws', state: 'passed'},
        ],
      },
      summary:
        '`scripts/fixtures/suites/typing-reads-logcat-since.ts`: 1 passed ("Scenario: The raw read is logged once a call, after its final read"), 0 failed, 0 expected crash reproduced, 0 expected failure, 3 inconclusive ("Scenario: adb rejects the time logcat reads from", "Scenario: logcat prints nothing from that time", "Scenario: Printing the raw read throws"), 0 device offline, 0 driver fault\n',
    })
  }, 60_000)
})
