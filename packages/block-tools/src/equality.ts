export function isEqualMarks(
  a: Array<string> | undefined,
  b: Array<string> | undefined,
): boolean {
  if (!a || !b) {
    return a === b
  }

  if (a.length !== b.length) {
    return false
  }

  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) {
      return false
    }
  }

  return true
}
