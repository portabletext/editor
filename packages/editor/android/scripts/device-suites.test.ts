import {fileURLToPath} from 'node:url'
import {runSuite} from 'thumbjar/testing'
import {describe, expect, test} from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('the Japanese device tests', () => {
  test('passes every case when Gboard commits a word as kana', async () => {
    expect(
      await runSuite({
        root,
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-commits-kana-then-kanji.ts',
        ],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice into a plain contenteditable',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice into an empty block',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice after existing text',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('fails every case when the text is right but the page recorded no composition', async () => {
    expect(
      await runSuite({
        root,
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-records-no-composition.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice into a plain contenteditable',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice into an empty block',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice after existing text',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
})
