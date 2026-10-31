import {expect, test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

const REMOVE_CHILD = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

test('Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting', async () => {
  const typed = await typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '- ',
    words: [
      {
        letters: '',
        enter: true,
        expect: {
          trigger: 'commit',
          text: '- ',
          deletedOnCommit: '- ',
          textOnCommit: '',
          blocksOnCommit: 1,
        },
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(typed.errors).toEqual([])
})

test('Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting', async () => {
  const typed = await typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [
      {
        letters: '- ',
        enter: true,
        expect: {
          trigger: 'commit',
          text: '- ',
          deletedOnCommit: '- ',
          textOnCommit: '',
          blocksOnCommit: 1,
        },
      },
    ],
    crash: REMOVE_CHILD,
  })

  expect(typed.errors).toEqual([])
})
