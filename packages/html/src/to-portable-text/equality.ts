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

/**
 * More or less copied from Remeda (https://github.com/remeda/remeda/blob/main/packages/remeda/src/isDeepEqual.ts)
 */
export function isDeepEqual<A, B>(data: A, other: B) {
  return isDeepEqualImplementation(data, other)
}

function isDeepEqualImplementation<T>(data: unknown, other: T): data is T {
  if (data === other) {
    return true
  }

  if (Object.is(data, other)) {
    return true
  }

  if (typeof data !== 'object' || typeof other !== 'object') {
    return false
  }

  if (data === null || other === null) {
    return false
  }

  if (Object.getPrototypeOf(data) !== Object.getPrototypeOf(other)) {
    return false
  }

  if (Array.isArray(data)) {
    return isDeepEqualArrays(data, other as unknown as ReadonlyArray<unknown>)
  }

  if (data instanceof Map) {
    return isDeepEqualMaps(data, other as unknown as Map<unknown, unknown>)
  }

  if (data instanceof Set) {
    return isDeepEqualSets(data, other as unknown as Set<unknown>)
  }

  if (data instanceof Date) {
    return data.getTime() === (other as unknown as Date).getTime()
  }

  if (data instanceof RegExp) {
    return data.toString() === (other as unknown as RegExp).toString()
  }

  if (Object.keys(data).length !== Object.keys(other).length) {
    return false
  }

  for (const [key, value] of Object.entries(data)) {
    if (!(key in other)) {
      return false
    }

    if (
      !isDeepEqualImplementation(
        value,
        // @ts-expect-error [ts7053] - We already checked that `other` has `key`
        other[key],
      )
    ) {
      return false
    }
  }

  return true
}

function isDeepEqualArrays(
  data: ReadonlyArray<unknown>,
  other: ReadonlyArray<unknown>,
): boolean {
  if (data.length !== other.length) {
    return false
  }

  for (const [index, item] of data.entries()) {
    if (!isDeepEqualImplementation(item, other[index])) {
      return false
    }
  }

  return true
}

function isDeepEqualMaps(
  data: ReadonlyMap<unknown, unknown>,
  other: ReadonlyMap<unknown, unknown>,
): boolean {
  if (data.size !== other.size) {
    return false
  }

  for (const [key, value] of data.entries()) {
    if (!other.has(key)) {
      return false
    }

    if (!isDeepEqualImplementation(value, other.get(key))) {
      return false
    }
  }

  return true
}

function isDeepEqualSets(
  data: ReadonlySet<unknown>,
  other: ReadonlySet<unknown>,
): boolean {
  if (data.size !== other.size) {
    return false
  }

  const otherCopy = [...other]

  for (const dataItem of data) {
    let isFound = false

    for (const [index, otherItem] of otherCopy.entries()) {
      if (isDeepEqualImplementation(dataItem, otherItem)) {
        isFound = true
        otherCopy.splice(index, 1)
        break
      }
    }

    if (!isFound) {
      return false
    }
  }

  return true
}
