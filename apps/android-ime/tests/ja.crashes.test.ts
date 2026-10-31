import {expect, test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

const REMOVE_CHILD = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

test('Scenario: Typing kyou twice while each 今日 is decorated as it is committed', async () => {
  // A word committed as kana never makes the decoration appear, so both candidates are required: the
  // driver faults instead of committing a word by Space.
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=今日',
    prefix: '',
    words: [
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {
          composing: true,
          committedOnCommit: '今日',
          decoratedOnCommit: '今日',
        },
      },
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {
          trigger: 'commit',
          composing: true,
          committedOnCommit: '今日',
          decoratedOnCommit: '今日',
        },
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(typed.errors).toEqual([])
})

test.fails('Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it', async () => {
  // Fails on Android: the editor throws `removeChild`'s `NotFoundError` when 今日 replaces word 2's
  // composing きょう while its decoration is mounted, so the decoration's span goes in the same commit.
  // Word 1 only sets up the composition the trigger needs, so it may be committed as kana by Space, as
  // Gboard does on a fresh field when it offers no 今日 yet. Word 2's conversion is the trigger, so its
  // candidate is required.
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう',
    prefix: '',
    words: [
      {
        letters: 'kyou',
        candidate: '今日',
        expect: {
          composing: true,
          committed: 'きょう',
          decorated: 'きょう',
        },
      },
      {
        letters: 'kyou',
        candidate: '今日',
        required: true,
        expect: {
          trigger: 'commit',
          composing: true,
          committed: 'きょう',
          decorated: 'きょう',
          droppedOnCommit: 'きょう',
          removedOnCommit: true,
        },
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(typed.errors).toEqual([])
})
