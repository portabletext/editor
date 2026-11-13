import {readFileSync} from 'node:fs'
import {join} from 'node:path'
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
  expect(globalThis.gboardDevice.pageActionRetries).toEqual([false, false])
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
  globalThis.gboardDevice.pageState = 'B: foo|'
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
  const records = JSON.parse(
    readFileSync(
      join(
        process.env.THUMBJAR_OUT_DIR!,
        `en-${context.task.name
          .replace(/^Scenario: /, '')
          .replace(/[^a-zA-Z0-9._-]+/g, '-')
          .toLowerCase()}.json`,
      ),
      'utf8',
    ),
  ).records
  expect(records[4]).toEqual({
    type: 'page',
    status: 'failed',
    reason: 'Error: page socket lost',
    stateAfter: 'B: foo|',
    textAfter: '\n',
    selectionAfter: {anchor: 1, focus: 1},
    focusedAfter: true,
    events: [],
    keys: [],
  })
})

test('Scenario: A page case may contain digits absent from keyboard inputs', async (context) => {
  globalThis.gboardDevice.rewrittenText = '7'
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'page', action: 'state', args: '7'}],
  })
  await vi.runAllTimersAsync()
  const run = await running
  expect(run.text).toEqual('7')
  expect(globalThis.gboardDevice.attempt).toEqual(1)
})
