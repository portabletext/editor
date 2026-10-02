/**
 * The checks the `Then` steps make. They throw a plain `Error` naming what
 * was checked, so the steps run outside a test framework as well as in one.
 */
export function checkEqual(
  what: string,
  actual: string | number | boolean | undefined,
  expected: string | number | boolean | undefined,
): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${what}: expected ${format(expected)}, got ${format(actual)}`,
    )
  }
}

export function checkNotEqual(
  what: string,
  actual: string | number | boolean | undefined,
  unexpected: string | number | boolean | undefined,
): void {
  if (Object.is(actual, unexpected)) {
    throw new Error(`${what}: expected anything but ${format(unexpected)}`)
  }
}

export function checkGreaterThan(
  what: string,
  actual: number,
  bound: number,
): void {
  if (!(actual > bound)) {
    throw new Error(`${what}: expected more than ${bound}, got ${actual}`)
  }
}

export function checkEmpty(what: string, actual: Array<unknown>): void {
  if (actual.length > 0) {
    throw new Error(`${what}: expected none, got ${format(actual)}`)
  }
}

function format(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value)
}
