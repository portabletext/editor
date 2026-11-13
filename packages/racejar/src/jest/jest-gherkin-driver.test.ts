import {expect, test, vi} from 'vitest'
import {After, Before} from '../hooks'
import {Given} from '../step-definitions'

type JestCallback = (...args: Array<unknown>) => unknown

const jest = vi.hoisted(() => ({
  beforeEach: [] as Array<JestCallback>,
  afterEach: [] as Array<JestCallback>,
  tests: [] as Array<JestCallback>,
}))

vi.mock('@jest/globals', () => {
  const describe = (_name: string, fn: () => void) => fn()
  const test = (_name: string, fn: JestCallback) => {
    jest.tests.push(fn)
  }
  return {
    describe: Object.assign(describe, {only: describe, skip: describe}),
    test: Object.assign(test, {only: test, skip: test}),
    beforeEach: (fn: JestCallback) => {
      jest.beforeEach.push(fn)
    },
    afterEach: (fn: JestCallback) => {
      jest.afterEach.push(fn)
    },
  }
})

const {Feature} = await import('./jest-gherkin-driver')

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
