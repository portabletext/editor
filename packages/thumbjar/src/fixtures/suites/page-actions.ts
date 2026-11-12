import {beforeEach, expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: A page transport fault before input replays the whole case', async (context) => {
  globalThis.gboardDevice.pageState = 'B: foo|'
  globalThis.gboardDevice.pageActionErrors = [new Error('page socket lost')]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'page', action: 'select', args: {offset: 0}},
      {type: 'enter'},
    ],
  })
  await vi.runAllTimersAsync()
  const run = await running
  expect(globalThis.gboardDevice.attempt).toEqual(2)
  expect(globalThis.gboardDevice.pageActions).toEqual([
    'window.__action("select", {"offset":0})',
    'window.__action("select", {"offset":0})',
  ])
  expect(run.steps).toEqual([
    {
      type: 'page',
      status: 'done',
      stateAfter: 'B: foo|',
      textAfter: '',
      selectionAfter: {anchor: 0, focus: 0},
      focusedAfter: true,
      events: [],
      keys: [],
    },
    {
      type: 'enter',
      status: 'done',
      stateAfter: 'B: foo|',
      textAfter: '\n',
      selectionAfter: {anchor: 1, focus: 1},
      focusedAfter: true,
      events: [],
      keys: ['Enter'],
    },
  ])
})

test('Scenario: A page transport fault in step five after input in step two is inconclusive', async (context) => {
  globalThis.gboardDevice.pageActionErrors = [
    undefined,
    undefined,
    undefined,
    new Error('page socket lost'),
  ]
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'page', action: 'select'},
      {type: 'enter'},
      {type: 'page', action: 'select'},
      {type: 'page', action: 'select'},
      {type: 'page', action: 'select'},
    ],
  }).catch(String)
  await vi.runAllTimersAsync()
  expect(await running).toEqual(
    [
      'Error: page socket lost',
      'Steps:',
      "  1. page: done, textAfter '', keys none",
      "  2. enter: done, textAfter '\\n', keys Enter",
      "  3. page: done, textAfter '\\n', keys none",
      "  4. page: done, textAfter '\\n', keys none",
      "  5. page: failed (Error: page socket lost), textAfter '\\n', keys none",
    ].join('\n'),
  )
  expect(globalThis.gboardDevice.attempt).toEqual(1)
  expect(driverRuns.at(-1)?.state).toEqual('inconclusive')
})
