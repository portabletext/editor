/**
 * Structural equality over plain JSON values: object keys compare
 * order-insensitively, array elements compare order-sensitively by index.
 * Engine blocks (and what `toEngineBlock` produces from them) are plain
 * JSON, so this is exact for shape comparisons that need every field, not
 * just the fields `isEqualBlocks` knows about.
 */
export function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false
    }
    for (let index = 0; index < a.length; index++) {
      if (!deepEqualJson(a[index], b[index])) {
        return false
      }
    }
    return true
  }

  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object'
  ) {
    const recordA = a as Record<string, unknown>
    const recordB = b as Record<string, unknown>
    const keysA = Object.keys(recordA)
    const keysB = Object.keys(recordB)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (
        !Object.prototype.hasOwnProperty.call(recordB, key) ||
        !deepEqualJson(recordA[key], recordB[key])
      ) {
        return false
      }
    }

    return true
  }

  return false
}
