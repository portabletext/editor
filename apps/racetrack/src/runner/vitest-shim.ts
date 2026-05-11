/**
 * Shim for `vitest` (NOT `vitest/browser`).
 *
 * Step definitions in `@portabletext/editor/test/vitest` import `assert`,
 * `expect`, and `vi` from `vitest`. Inside vitest these are real
 * implementations; inside Racetrack we redirect via vite alias to this
 * file.
 *
 * Implement only what step-definitions.tsx and test-editor.tsx actually
 * use. Anything else throws so missing coverage shows up as a loud
 * error instead of silently passing.
 */

type WaitForOptions = {
  timeout?: number
  interval?: number
}

const DEFAULT_TIMEOUT = 1000
const DEFAULT_INTERVAL = 50

async function waitFor<T>(
  fn: () => T | Promise<T>,
  options: WaitForOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const interval = options.interval ?? DEFAULT_INTERVAL
  const start = Date.now()
  let lastError: unknown

  while (Date.now() - start < timeout) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new Error(`vi.waitFor: timed out after ${timeout}ms`)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null) {
    return a === b
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }
    return true
  }
  const ka = Object.keys(a as Record<string, unknown>)
  const kb = Object.keys(b as Record<string, unknown>)
  if (ka.length !== kb.length) {
    return false
  }
  for (const key of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false
    }
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    ) {
      return false
    }
  }
  return true
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

class Expectation {
  constructor(
    private actual: unknown,
    private message?: string,
    private negated = false,
  ) {}

  get not(): Expectation {
    return new Expectation(this.actual, this.message, !this.negated)
  }

  private prefix(): string {
    return this.message ? `${this.message}: ` : ''
  }

  toEqual(expected: unknown): void {
    const equal = deepEqual(this.actual, expected)
    if (this.negated ? equal : !equal) {
      throw new Error(
        `${this.prefix()}expected ${stringify(this.actual)} ${
          this.negated ? 'not ' : ''
        }toEqual ${stringify(expected)}`,
      )
    }
  }

  toBe(expected: unknown): void {
    const equal = Object.is(this.actual, expected)
    if (this.negated ? equal : !equal) {
      throw new Error(
        `${this.prefix()}expected ${stringify(this.actual)} ${
          this.negated ? 'not ' : ''
        }toBe ${stringify(expected)}`,
      )
    }
  }

  toContain(expected: unknown): void {
    const actual = this.actual
    let contains = false
    if (typeof actual === 'string') {
      contains = typeof expected === 'string' && actual.includes(expected)
    } else if (Array.isArray(actual)) {
      contains = actual.some((item) => deepEqual(item, expected))
    } else {
      throw new Error(
        `${this.prefix()}toContain requires a string or array actual; got ${typeof actual}`,
      )
    }
    if (this.negated ? contains : !contains) {
      throw new Error(
        `${this.prefix()}expected ${stringify(this.actual)} ${
          this.negated ? 'not ' : ''
        }toContain ${stringify(expected)}`,
      )
    }
  }

  toBeNull(): void {
    const isNull = this.actual === null
    if (this.negated ? isNull : !isNull) {
      throw new Error(
        `${this.prefix()}expected ${stringify(this.actual)} ${
          this.negated ? 'not ' : ''
        }toBeNull`,
      )
    }
  }

  toBeLessThan(expected: number): void {
    if (typeof this.actual !== 'number') {
      throw new Error(
        `${this.prefix()}toBeLessThan requires a number actual; got ${typeof this.actual}`,
      )
    }
    const less = this.actual < expected
    if (this.negated ? less : !less) {
      throw new Error(
        `${this.prefix()}expected ${this.actual} ${
          this.negated ? 'not ' : ''
        }toBeLessThan ${expected}`,
      )
    }
  }

  toHaveProperty(key: string): void {
    const has =
      this.actual != null &&
      typeof this.actual === 'object' &&
      Object.prototype.hasOwnProperty.call(this.actual, key)
    if (this.negated ? has : !has) {
      throw new Error(
        `${this.prefix()}expected ${stringify(this.actual)} ${
          this.negated ? 'not ' : ''
        }toHaveProperty ${stringify(key)}`,
      )
    }
  }
}

type ElementMatchers = {
  toBeInTheDocument(): void
}

function elementMatchers(loc: ElementLike, negated = false): ElementMatchers {
  return {
    toBeInTheDocument() {
      const inDoc = (() => {
        try {
          const el = loc.element()
          return !!el && document.contains(el)
        } catch {
          return false
        }
      })()
      if (negated ? inDoc : !inDoc) {
        throw new Error(
          `expected element ${negated ? 'not ' : ''}to be in the document`,
        )
      }
    },
  }
}

// Minimal locator-shape used by `expect.element(...)`. Defined here to
// avoid an import cycle with vitest-browser-shim.
type ElementLike = {
  element(): Element
}

type ExpectFn = ((actual: unknown, message?: string) => Expectation) & {
  element(loc: ElementLike): ElementMatchers & {
    not: ElementMatchers
  }
}

const expectFn = ((actual: unknown, message?: string) =>
  new Expectation(actual, message)) as ExpectFn

expectFn.element = (loc: ElementLike) => {
  return Object.assign(elementMatchers(loc), {
    not: elementMatchers(loc, true),
  })
}

export const expect = expectFn

export function assert(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed')
  }
}
assert.fail = (message?: string): never => {
  throw new Error(message ?? 'Assertion failed')
}

type MockedFn<T extends (...args: never[]) => unknown> = T & {
  mock: {calls: Array<Parameters<T>>}
}

function vifn<T extends (...args: never[]) => unknown>(
  implementation?: T,
): MockedFn<T> {
  const calls: Array<Parameters<T>> = []
  const wrapped = ((...args: Parameters<T>) => {
    calls.push(args)
    return implementation?.(...args)
  }) as MockedFn<T>
  wrapped.mock = {calls}
  return wrapped
}

export const vi = {
  waitFor,
  fn: vifn,
}
