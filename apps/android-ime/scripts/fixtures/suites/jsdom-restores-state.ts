import {afterAll, afterEach, beforeEach} from 'vitest'

// Checks that each jsdom case leaves `globalThis.__state` as it found it, failed cases included. Tests
// named `Scenario: Typing ...` start with a `__state` of their own, the others without one.
const saved = () => 'saved before the test'
const leftBehind: string[] = []

beforeEach(({task}) => {
  if (task.name.startsWith('Scenario: Typing'))
    Object.defineProperty(globalThis, '__state', {
      value: saved,
      configurable: true,
      writable: true,
    })
})

afterEach(({task}) => {
  const expected = task.name.startsWith('Scenario: Typing') ? saved : undefined
  if (
    Object.getOwnPropertyDescriptor(globalThis, '__state')?.value !== expected
  )
    leftBehind.push(task.name)
  delete (globalThis as Record<string, unknown>).__state
})

afterAll(() => {
  if (leftBehind.length > 0)
    throw new Error(
      `\`__state\` was not restored after ${leftBehind.map((name) => `"${name}"`).join(', ')}`,
    )
})
