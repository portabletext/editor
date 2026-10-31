import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: An error the page already recorded before Enter ends a crash case there', async () => {
  vi.useFakeTimers()
  globalThis.pageState = {
    text: '- ',
    blocks: 2,
    events: [],
    errors: [
      "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
    ],
  }
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '- ',
    words: [{letters: '', enter: true, expect: {trigger: 'letters'}}],
    crash: /^NotFoundError: Failed to execute 'removeChild' on 'Node'/,
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    attempts: globalThis.pageAttempts(),
    runs: driverRuns.map((run) => run.state),
  }).toEqual({
    typed: {
      text: '- ',
      picked: [],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [
        "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
      ],
      blocks: 2,
      beforeCommit: [{text: '- ', blocks: 2}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    attempts: 1,
    runs: ['complete'],
  })
})

test('Scenario: A page without errors or blocks in its state', async () => {
  vi.useFakeTimers()
  globalThis.pageState = {text: 'Kyou ', events: []}
  const typing = typeOnDevice({
    lang: 'en',
    page: 'plain.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  })
  await vi.runAllTimersAsync()

  expect({
    typed: await typing,
    attempts: globalThis.pageAttempts(),
    runs: driverRuns.map((run) => run.state),
  }).toEqual({
    typed: {
      text: 'Kyou ',
      picked: ['space'],
      compositionstart: 0,
      compositionupdate: 0,
      nested: 0,
      compositionstartPerWord: [0],
      errors: [],
      blocks: null,
      beforeCommit: [{text: 'Kyou ', blocks: null}],
      decoratedPerWord: [[]],
      committedRanges: [],
    },
    attempts: 1,
    runs: ['complete', 'complete'],
  })
})
