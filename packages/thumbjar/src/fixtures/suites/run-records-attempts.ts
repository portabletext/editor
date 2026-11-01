import {vi} from 'vitest'

const attempts = vi.hoisted(() => ({
  calls: [] as string[],
  firstAttemptHeld: undefined as Promise<void> | undefined,
}))

vi.mock(import('../../gboard/typing.ts'), async (importOriginal) => ({
  ...(await importOriginal()),
  runInChrome: async (name: string) => {
    attempts.calls.push(`start ${name}`)
    const held = attempts.firstAttemptHeld
    attempts.firstAttemptHeld = undefined
    await held
    attempts.calls.push(`end ${name}`)
    return {steps: [], text: 'foo', selection: null, events: []}
  },
  dumpFailure: async () => {},
  closeChrome: async () => {},
  clearChromeTabs: async () => {},
}))

declare global {
  var deviceCalls: string[]
  /** Keeps the next attempt on the device until it settles. */
  var holdFirstAttempt: Promise<void>
}
globalThis.deviceCalls = attempts.calls
Object.defineProperty(globalThis, 'holdFirstAttempt', {
  set: (held: Promise<void>) => {
    attempts.firstAttemptHeld = held
  },
})
