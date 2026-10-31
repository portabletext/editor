import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'
import {SPACE_TEST_TIMEOUT_SECONDS} from '../scripts/lib/budget.ts'

vi.setConfig({testTimeout: SPACE_TEST_TIMEOUT_SECONDS * 1000})

const REMOVE_CHILD = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const COMPOSED =
  'English Gboard composed, so this control run no longer controls for composition'

// English Gboard commits each letter without composing, so these cases show that decorations which appear
// while typing leave no error without an open composition, next to `ja.crashes.test.ts`, where they do
// under one.

test('Scenario: Typing kyou twice while each you is decorated as it completes', async () => {
  const typed = await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [
      {letters: 'kyou', expect: {committed: 'you', decorated: 'you'}},
      {
        letters: 'kyou',
        expect: {trigger: 'letters', committed: 'you', decorated: 'you'},
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(
    {
      compositionstart: typed.compositionstart,
      compositionupdate: typed.compositionupdate,
    },
    COMPOSED,
  ).toEqual({compositionstart: 0, compositionupdate: 0})
  expect({
    text: typed.text,
    picked: typed.picked,
    committedRanges: typed.committedRanges,
    errors: typed.errors,
  }).toEqual({
    text: 'Kyou kyou ',
    picked: ['space', 'space'],
    committedRanges: [
      [],
      [{text: 'you', composing: false}],
      [
        {text: 'you', composing: false},
        {text: 'you', composing: false},
      ],
    ],
    errors: [],
  })
})

test('Scenario: Typing u after yo wraps every character the block held in a decoration', async () => {
  const typed = await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: 'yo',
    words: [
      {
        letters: 'u',
        expect: {trigger: 'letters', committed: 'you', decorated: 'you'},
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(
    {
      compositionstart: typed.compositionstart,
      compositionupdate: typed.compositionupdate,
    },
    COMPOSED,
  ).toEqual({compositionstart: 0, compositionupdate: 0})
  expect({
    text: typed.text,
    picked: typed.picked,
    committedRanges: typed.committedRanges,
    errors: typed.errors,
  }).toEqual({
    text: 'you ',
    picked: ['space'],
    committedRanges: [[], [{text: 'you', composing: false}]],
    errors: [],
  })
})
