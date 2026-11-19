import {fileURLToPath} from 'node:url'
import {runSuite} from 'thumbjar/testing'
import {describe, expect, test} from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('the Japanese device tests', () => {
  test('fails every case when the run returns kana for required candidates', async () => {
    expect(
      await runSuite({
        root,
        file: 'tests/ja.test.ts',
        setupFiles: ['scripts/fixtures/suites/typing-commits-kana.ts'],
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

  test('passes every case when the run returns the required kanji', async () => {
    expect(
      await runSuite({
        root,
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-commits-kanji-with-space.ts',
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

  test('fails every case when a tapped kanji candidate remains kana', async () => {
    expect(
      await runSuite({
        root,
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-keeps-kana-after-picking-kanji.ts',
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
