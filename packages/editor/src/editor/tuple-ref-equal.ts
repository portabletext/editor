/**
 * Reference-equality comparator for fixed-length tuples. Each slot is
 * compared via `Object.is`; the tuple is considered equal when every
 * slot's reference is unchanged. Lets a multi-slot `useSelector` skip
 * re-renders unless one of the slots actually changes.
 */
export function tupleRefEqual<T extends readonly unknown[]>(
  previous: T | null,
  next: T,
): boolean {
  if (previous === null || previous.length !== next.length) {
    return false
  }
  for (let i = 0; i < previous.length; i++) {
    if (!Object.is(previous[i], next[i])) {
      return false
    }
  }
  return true
}
