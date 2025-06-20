import {findIndex} from 'lodash'
import applyPatch from './applyPatch'
import insert from './arrayInsert'
import type {JSONValue, Patch, PathSegment} from './types'

function findTargetIndex(array: any[], pathSegment: PathSegment | undefined) {
  if (typeof pathSegment === 'number') {
    return pathSegment
  }
  const index = findIndex(array, pathSegment)
  return index === -1 ? false : index
}

export function applyPatchToArray(
  value: Array<JSONValue>,
  patch: Patch,
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
