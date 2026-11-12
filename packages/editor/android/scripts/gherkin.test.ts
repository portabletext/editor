import {compileFeature} from 'racejar'
import type {Run} from 'thumbjar'
import {expect, test, vi} from 'vitest'
import type {TestContext} from 'vitest'
import {assertBoundaries, collect, deviceDefinitions} from './gherkin.ts'

test('collects interleaved assertions against their preceding boundary', () => {
  const collection = {steps: [], assertions: [], unsupported: []}
  collect(collection, 'Context', 'one editor')
  collect(collection, 'Context', 'the editor state is "B: foo"')
  collect(collection, 'Action', 'the editor is focused')
  collect(collection, 'Action', 'the caret is put after "f"')
  collect(collection, 'Action', '"{Enter}" is pressed')
  collect(collection, 'Outcome', 'the editor state is "B: f;;B: |oo"')
  collect(collection, 'Action', '"bar" is inserted')
  collect(collection, 'Outcome', 'the editor state is "B: f;;B: bar|oo"')
  expect(collection).toEqual({
    steps: [
      {type: 'page', action: 'state', args: 'B: foo'},
      {type: 'page', action: 'focus'},
      {type: 'page', action: 'after', args: 'f'},
      {type: 'enter'},
      {type: 'page', action: 'insert', args: 'bar'},
    ],
    assertions: [
      {
        boundary: 3,
        text: 'the editor state is "B: f;;B: |oo"',
        expected: 'B: f\nB: |oo',
        kind: 'state',
      },
      {
        boundary: 4,
        text: 'the editor state is "B: f;;B: bar|oo"',
        expected: 'B: f\nB: bar|oo',
        kind: 'state',
      },
    ],
    unsupported: [],
  })
})

test('runs a scenario once and checks intermediate boundaries rather than its final state', async () => {
  const run = vi.fn(
    (): Promise<Run> =>
      Promise.resolve({
        text: 'bar',
        selection: null,
        events: [],
        state: 'B: bar|',
        steps: [
          {
            type: 'page',
            status: 'done',
            stateAfter: 'B: foo|',
            textAfter: 'foo',
            selectionAfter: null,
            focusedAfter: true,
            events: [],
            keys: [],
          },
          {
            type: 'page',
            status: 'done',
            stateAfter: 'B: bar|',
            textAfter: 'bar',
            selectionAfter: null,
            focusedAfter: true,
            events: [],
            keys: [],
          },
        ],
      }),
  )
  const feature = compileFeature({
    featureText: `Feature: boundaries
Scenario: interleaved
Given the editor state is "B: foo"
Then the editor state is "B: foo|"
When "bar" is inserted
Then the editor state is "B: bar|"`,
    ...deviceDefinitions(run),
  })
  const context = {
    task: {name: 'interleaved'},
    signal: new AbortController().signal,
  } as TestContext & {collection: Parameters<typeof collect>[0]}
  for (const before of feature.beforeHooks) {
    await before(context)
  }
  for (const step of feature.scenarios[0]!.steps) {
    await step()
  }
  for (const after of feature.afterHooks) {
    await after(context)
  }
  expect(run.mock.calls.length).toEqual(1)
})

test('names the Then step and boundary when an expectation fails', () => {
  expect(() =>
    assertBoundaries(
      {
        steps: [],
        unsupported: [],
        assertions: [
          {
            boundary: 0,
            text: 'the editor state is "B: foo|"',
            expected: 'B: foo|',
            kind: 'state',
          },
        ],
      },
      {
        text: 'bar',
        selection: null,
        events: [],
        steps: [
          {
            type: 'page',
            status: 'done',
            stateAfter: 'B: bar|',
            textAfter: 'bar',
            selectionAfter: null,
            focusedAfter: true,
            events: [],
            keys: [],
          },
        ],
      },
    ),
  ).toThrow('Then the editor state is "B: foo|" (boundary 1)')
})

test('marks unsupported hardware and uppercase typing before the device is called', () => {
  const collection = {steps: [], assertions: [], unsupported: []}
  collect(collection, 'Action', '"{ArrowRight}" is pressed')
  collect(collection, 'Action', '"Foo" is typed')
  collect(collection, 'Action', '"{Backspace}" is pressed 3 times')
  expect(collection).toEqual({
    steps: [{type: 'backspace', times: 3}],
    assertions: [],
    unsupported: ['"{ArrowRight}" is pressed', '"Foo" is typed'],
  })
})

test('an expectation in racejar After fails the owning Vitest scenario with its Then text', async () => {
  const {startVitest} = await import('vitest/node')
  const exitCode = process.exitCode
  const vitest = await startVitest('test', [], {
    root: new URL('..', import.meta.url).pathname,
    config: false,
    watch: false,
    include: ['scripts/fixtures/suites/gherkin-after.ts'],
    reporters: [],
  })
  try {
    const [module] = vitest.state.getTestModules()
    const [scenario, unsupported] = [...module!.children.allTests()]
    expect(unsupported!.result()).toEqual({
      state: 'skipped',
      note: 'Not drivable: "{ArrowRight}" is pressed',
      errors: undefined,
    })
    expect(module!.state()).toEqual('failed')
    expect(scenario!.result().state).toEqual('failed')
    expect(scenario!.result().errors?.map((error) => error.message)).toEqual([
      expect.stringContaining(
        'Then the editor state is "B: foo|" (boundary 1)',
      ),
    ])
  } finally {
    await vitest.close()
    process.exitCode = exitCode
  }
}, 30_000)

test('skips an unsupported row with a reason before calling the driver', async () => {
  const run = vi.fn(
    (): Promise<Run> =>
      Promise.resolve({steps: [], text: null, selection: null, events: []}),
  )
  const feature = compileFeature({
    featureText: `Feature: hardware
Scenario: unsupported
Given one editor
When "{ArrowRight}" is pressed`,
    ...deviceDefinitions(run),
  })
  const context = {
    task: {name: 'unsupported'},
    signal: new AbortController().signal,
    skip: (reason: string) => {
      throw new Error(reason)
    },
  } as TestContext & {collection: Parameters<typeof collect>[0]}
  for (const before of feature.beforeHooks) {
    await before(context)
  }
  for (const step of feature.scenarios[0]!.steps) {
    await step()
  }
  await expect(feature.afterHooks[0]!(context)).rejects.toThrow(
    'Not drivable: "{ArrowRight}" is pressed',
  )
  expect(run.mock.calls).toEqual([])
})

test('the real English suite expects the full-selection Enter failure and rejects a device fix', async () => {
  const {startVitest} = await import('vitest/node')
  for (const mode of ['broken', 'fixed']) {
    const exitCode = process.exitCode
    const previousMode = process.env['RACEJAR_DEVICE_PROBE']
    process.env['RACEJAR_DEVICE_PROBE'] = mode
    const runner = await startVitest('test', [], {
      root: new URL('..', import.meta.url).pathname,
      config: false,
      watch: false,
      include: ['scripts/fixtures/suites/gherkin-expected-failure.ts'],
      testNamePattern: 'Pressing Enter when selecting the entire content',
      reporters: [],
    })
    try {
      const [module] = runner.state.getTestModules()
      const scenario = [...module!.children.allTests()].find(
        (scenario) =>
          scenario.name === 'Pressing Enter when selecting the entire content',
      )!
      expect(module!.state()).toEqual(mode === 'broken' ? 'passed' : 'failed')
      expect(scenario.result().state).toEqual(
        mode === 'broken' ? 'passed' : 'failed',
      )
      expect(scenario.result().errors?.map((error) => error.message)).toEqual(
        mode === 'broken' ? undefined : ['Expect test to fail'],
      )
    } finally {
      await runner.close()
      process.exitCode = exitCode
      if (previousMode === undefined) {
        delete process.env['RACEJAR_DEVICE_PROBE']
      } else {
        process.env['RACEJAR_DEVICE_PROBE'] = previousMode
      }
    }
  }
}, 30_000)
