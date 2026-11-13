import {beforeEach, expect, test, vi} from 'vitest'
import {After, Before} from '../hooks'
import {Given} from '../step-definitions'

type JestCallback = (...args: Array<unknown>) => unknown

const jest = vi.hoisted(() => ({
  beforeEach: [] as Array<JestCallback>,
  afterEach: [] as Array<JestCallback>,
  tests: [] as Array<JestCallback>,
  registrations: [] as Array<string>,
}))

vi.mock('@jest/globals', () => {
  const describe = (_name: string, fn: () => void) => fn()
  const register = (tag: string) => (_name: string, fn: JestCallback) => {
    jest.tests.push(fn)
    jest.registrations.push(tag)
  }
  const failing = Object.assign(register('test.failing'), {
    only: register('test.failing.only'),
    skip: register('test.failing.skip'),
  })
  const test = Object.assign(register('test'), {
    failing,
    only: Object.assign(register('test.only'), {failing: failing.only}),
    skip: Object.assign(register('test.skip'), {failing: failing.skip}),
  })
  return {
    describe: Object.assign(describe, {only: describe, skip: describe}),
    test,
    beforeEach: (fn: JestCallback) => {
      jest.beforeEach.push(fn)
    },
    afterEach: (fn: JestCallback) => {
      jest.afterEach.push(fn)
    },
  }
})

const {Feature} = await import('./jest-gherkin-driver')

beforeEach(() => {
  jest.beforeEach.length = 0
  jest.afterEach.length = 0
  jest.tests.length = 0
  jest.registrations.length = 0
})

type Context = {value: string}

// Resolves after a macrotask, so the hook finishes only if Jest awaits it.
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0))

test('Before and After hooks run as Jest hooks without a `done` callback', async () => {
  const events: Array<string> = []

  Feature({
    featureText: `
      Feature: Hooks
        Scenario: Scenario
          Given the value changes`,
    hooks: [
      Before((context: Context) => {
        context.value = 'foo'
        events.push('sync Before')
      }),
      Before(async (context: Context) => {
        await nextTask()
        events.push(`async Before ${context.value}`)
      }),
      After((context: Context) => {
        events.push(`sync After ${context.value}`)
      }),
      After(async (context: Context) => {
        await nextTask()
        events.push(`async After ${context.value}`)
      }),
    ],
    stepDefinitions: [
      Given('the value changes', (context: Context) => {
        context.value = 'bar'
      }),
    ],
  })

  // Jest waits for `done()` on any hook callback that declares a parameter.
  expect(jest.beforeEach.map((hook) => hook.length)).toEqual([0, 0, 0])
  expect(jest.afterEach.map((hook) => hook.length)).toEqual([0, 0])

  for (const hook of jest.beforeEach) {
    await hook()
  }
  for (const scenario of jest.tests) {
    await scenario()
  }
  for (const hook of jest.afterEach) {
    await hook()
  }

  expect(events).toEqual([
    'sync Before',
    'async Before foo',
    'sync After bar',
    'async After bar',
  ])
})

test('a throwing After does not stop a later CLEANUP After on a marked row', async () => {
  jest.beforeEach.length = 0
  jest.afterEach.length = 0
  jest.tests.length = 0
  jest.registrations.length = 0
  const events: Array<string> = []
  const failure = new Error('broken After')

  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo`,
    expectFail: () => true,
    stepDefinitions: [Given('foo', () => {})],
    hooks: [
      After(() => {
        events.push('throwing After')
        throw failure
      }),
      After(() => {
        events.push('CLEANUP After')
      }),
    ],
  })

  expect(jest.registrations).toEqual(['test.failing'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await expect(jest.tests[0]!()).rejects.toBe(failure)
  expect(events).toEqual(['throwing After', 'CLEANUP After'])
})

test('a marked row runs its After hooks inside its failing body in declared order', async () => {
  const events: Array<string> = []
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo`,
    expectFail: () => true,
    stepDefinitions: [
      Given('foo', () => {
        events.push('step')
      }),
    ],
    hooks: [
      After(() => {
        events.push('first After')
      }),
      After(() => {
        events.push('second After')
      }),
    ],
  })
  expect(jest.registrations).toEqual(['test.failing'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await expect(jest.tests[0]!()).resolves.toEqual(undefined)
  expect(events).toEqual(['step', 'first After', 'second After'])
})

test('afterEach skips marked row After hooks and runs unmarked row After hooks', async () => {
  const events: Array<string> = []
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo
Scenario: ordinary
Given foo`,
    expectFail: (scenario) => scenario.name === 'marked',
    stepDefinitions: [Given('foo', () => {})],
    hooks: [
      After(() => {
        events.push('After')
      }),
    ],
  })
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await jest.tests[0]!()
  for (const hook of jest.afterEach) {
    await hook()
  }
  expect(events).toEqual(['After'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await jest.tests[1]!()
  for (const hook of jest.afterEach) {
    await hook()
  }
  expect(events).toEqual(['After', 'After'])
})

test('several throwing After hooks become an AggregateError after CLEANUP runs', async () => {
  const events: Array<string> = []
  const first = new Error('foo')
  const second = new Error('bar')
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo`,
    expectFail: () => true,
    stepDefinitions: [Given('foo', () => {})],
    hooks: [
      After(() => {
        throw first
      }),
      After(() => {
        throw second
      }),
      After(() => {
        events.push('CLEANUP')
      }),
    ],
  })
  for (const hook of jest.beforeEach) {
    await hook()
  }
  const failure = await Promise.resolve()
    .then(() => jest.tests[0]!())
    .catch((error: unknown) => error)
  expect(failure instanceof AggregateError).toEqual(true)
  if (!(failure instanceof AggregateError)) {
    throw failure
  }
  expect(failure.errors).toEqual([first, second])
  expect(events).toEqual(['CLEANUP'])
})

test('a broken marked row rejects its failing test body', async () => {
  const failure = new Error('broken')
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo`,
    expectFail: () => true,
    stepDefinitions: [
      Given('foo', () => {
        throw failure
      }),
    ],
  })
  expect(jest.registrations).toEqual(['test.failing'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await expect(jest.tests[0]!()).rejects.toEqual(failure)
})

test('a fixed marked row resolves so Jest failing reports an unexpected pass', async () => {
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo`,
    expectFail: () => true,
    stepDefinitions: [Given('foo', () => {})],
  })
  expect(jest.registrations).toEqual(['test.failing'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await expect(jest.tests[0]!()).resolves.toEqual(undefined)
})

test('a stale predicate throws at collection', () => {
  expect(() =>
    Feature({
      featureText: `Feature: Expected failures
Scenario: ordinary
Given foo`,
      expectFail: () => false,
      stepDefinitions: [Given('foo', () => {})],
    }),
  ).toThrow('Expected failure predicate matched no scenario rows')
  expect(jest.registrations).toEqual([])
})

test('an ordinary broken row rejects its unmarked test body', async () => {
  const failure = new Error('broken')
  Feature({
    featureText: `Feature: Expected failures
Scenario: ordinary
Given foo`,
    stepDefinitions: [
      Given('foo', () => {
        throw failure
      }),
    ],
  })
  expect(jest.registrations).toEqual(['test'])
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await expect(jest.tests[0]!()).rejects.toEqual(failure)
})

test('a marked row whose Before throws does not leak its flag to the next row', async () => {
  const events: Array<string> = []
  const failure = new Error('Before')
  let brokenBefore = false
  Feature({
    featureText: `Feature: Expected failures
Scenario: marked
Given foo
Scenario: before fails
Given foo
Scenario: ordinary
Given foo`,
    expectFail: (scenario) => scenario.name !== 'ordinary',
    stepDefinitions: [Given('foo', () => {})],
    hooks: [
      Before(() => {
        if (brokenBefore) {
          throw failure
        }
      }),
      After(() => {
        events.push('After')
      }),
      After(() => {
        events.push('CLEANUP')
      }),
    ],
  })
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await jest.tests[0]!()
  for (const hook of jest.afterEach) {
    await hook()
  }
  brokenBefore = true
  for (const hook of jest.beforeEach.slice(0, -1)) {
    await hook()
  }
  await expect(
    Promise.resolve().then(() => jest.beforeEach.at(-1)!()),
  ).rejects.toEqual(failure)
  for (const hook of jest.afterEach) {
    await hook()
  }
  brokenBefore = false
  for (const hook of jest.beforeEach) {
    await hook()
  }
  await jest.tests[2]!()
  for (const hook of jest.afterEach) {
    await hook()
  }
  expect(events).toEqual([
    'After',
    'CLEANUP',
    'After',
    'CLEANUP',
    'After',
    'CLEANUP',
  ])
})

test('a marked `@only` row keeps its focus through test.failing.only', () => {
  Feature({
    featureText: `Feature: Expected failures
@only
Scenario: marked
Given foo
Scenario: ordinary
Given foo`,
    expectFail: (scenario) => scenario.name === 'marked',
    stepDefinitions: [Given('foo', () => {})],
  })
  expect(jest.registrations).toEqual(['test.failing.only', 'test'])
})

test('a marked `@skip` row stays skipped through test.failing.skip', () => {
  Feature({
    featureText: `Feature: Expected failures
@skip
Scenario: marked
Given foo
Scenario: ordinary
Given foo`,
    expectFail: (scenario) => scenario.name === 'marked',
    stepDefinitions: [Given('foo', () => {})],
  })
  expect(jest.registrations).toEqual(['test.failing.skip', 'test'])
})
