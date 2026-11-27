import insert from './arrayInsert'
import type {
  IndexTuple,
  JSONValue,
  KeyedSegment,
  Patch,
  PathSegment,
} from './types'

function isKeyedSegment(segment: unknown): segment is KeyedSegment {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}

function findTargetIndex(array: any[], pathSegment: PathSegment | undefined) {
  if (typeof pathSegment === 'number') {
    // Sanity counts a negative index from the end and leaves the value
    // unchanged when the index falls outside the array.
    const index = pathSegment < 0 ? array.length + pathSegment : pathSegment
    return index >= 0 && index < array.length ? index : false
  }
  if (isKeyedSegment(pathSegment)) {
    // Sanity skips items that are not objects, such as `null`, when it looks
    // an item up by `_key`.
    const index = array.findIndex(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        item._key === pathSegment._key,
    )
    return index === -1 ? false : index
  }
  return false
}

export function applyPatchToArray(
  value: Array<JSONValue>,
  patch: Patch,
  applyPatch: (value: unknown, patch: Patch) => unknown,
): Array<JSONValue> | undefined {
  const nextValue = value.slice() // make a copy for internal mutation

  if (patch.path.length === 0) {
    // its directed to me
    if (patch.type === 'setIfMissing') {
      if (!Array.isArray(patch.value)) {
        throw new Error('Cannot set value of an array to a non-array')
      }

      return value === undefined ? patch.value : value
    }

    if (patch.type === 'set') {
      if (!Array.isArray(patch.value)) {
        throw new Error('Cannot set value of an array to a non-array')
      }

      return patch.value
    }

    if (patch.type === 'unset') {
      return undefined
    }

    throw new Error(`Invalid array operation: ${patch.type}`)
  }

  const [head, ...tail] = patch.path

  if (
    patch.type === 'insert' &&
    tail.length === 0 &&
    value.length === 0 &&
    (head === 0 || head === -1)
  ) {
    // Sanity lets an insert into an empty array address the item it
    // will become, as `[0]` or `[-1]`.
    return insert(value, patch.position, 0, patch.items)
  }

  if (isIndexTuple(head)) {
    return applyPatchToRange(
      nextValue,
      head,
      {...patch, path: tail},
      applyPatch,
    )
  }

  const index = findTargetIndex(value, head)

  // If the given selector could not be found, return as-is
  if (index === false) {
    return nextValue
  }

  if (tail.length === 0) {
    if (patch.type === 'insert') {
      const {position, items} = patch
      return insert(value, position, index, items)
    } else if (patch.type === 'unset') {
      if (typeof index !== 'number') {
        throw new Error(
          `Expected array index to be a number, instead got "${index}"`,
        )
      }
      nextValue.splice(index, 1)
      return nextValue
    }
  }

  // The patch is not directed to me
  nextValue[index] = applyPatch(nextValue[index], {
    ...patch,
    path: tail,
  }) as JSONValue

  return nextValue
}

function applyPatchToRange(
  array: Array<JSONValue>,
  range: IndexTuple,
  patch: Patch,
  applyPatch: (value: unknown, patch: Patch) => unknown,
): Array<JSONValue> {
  const [start, end] = resolveRange(range, array.length)

  if (start === end) {
    // A reversed range such as `[3, 1]` lands here too: Sanity duplicates
    // items for it, which is a defect this package does not copy.
    return array
  }

  // Sanity was measured for `set` at the range itself and at one field
  // below it; deeper paths keep their old behaviour.
  if (patch.type === 'set' && patch.path.length <= 1) {
    for (let index = start; index < end; index++) {
      array[index] = applyPatch(array[index], patch) as JSONValue
    }
    return array
  }

  if (patch.path.length > 0) {
    return array
  }

  if (patch.type === 'unset') {
    array.splice(start, end - start)
    return array
  }

  if (patch.type === 'insert') {
    if (patch.position === 'before') {
      array.splice(start, 0, ...patch.items)
    } else if (patch.position === 'after') {
      array.splice(end, 0, ...patch.items)
    } else {
      array.splice(start, end - start, ...patch.items)
    }
  }

  return array
}

function isIndexTuple(segment: PathSegment | undefined): segment is IndexTuple {
  return (
    Array.isArray(segment) &&
    segment.length === 2 &&
    segment.every((bound) => bound === '' || Number.isInteger(bound))
  )
}

function resolveRange(
  [start, end]: IndexTuple,
  length: number,
): [start: number, end: number] {
  const first = clampBound(start === '' ? 0 : start, length)
  const last = clampBound(end === '' ? length : end, length)

  return [first, Math.max(first, last)]
}

function clampBound(bound: number, length: number) {
  return Math.min(length, Math.max(0, bound < 0 ? length + bound : bound))
}
