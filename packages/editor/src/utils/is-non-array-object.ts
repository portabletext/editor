// Keep in sync with the check in `packages/repair/src/rule.non-object.ts`,
// so the editor and repair agree on what a non-object is.
export function isNonArrayObject(
  value: unknown,
): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
