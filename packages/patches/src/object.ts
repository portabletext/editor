import {clone, omit} from 'lodash'
import applyPatch from './applyPatch'
import type {JSONValue, Patch} from './types'

export function applyPatchToObject(
  value: {[key: string]: JSONValue},
  patch: Patch,
): {[key: string]: JSONValue} | undefined {
  const nextValue = clone(value)

  if (patch.path.length === 0) {
    // its directed to me
    if (patch.type === 'set') {
      if (
        typeof patch.value === 'object' &&
        patch.value !== null &&
        !Array.isArray(patch.value)
      ) {
        return patch.value
      }

      throw new Error('Cannot set value of an object to a non-object')
    }

    if (patch.type === 'unset') {
      return undefined
    }

    throw new Error(`Invalid object operation: ${patch.type}`)
  }

  // The patch is not directed to me
  const [head, ...tail] = patch.path

  if (typeof head !== 'string') {
    throw new Error(`Expected field name to be a string, instead got: ${head}`)
  }

  if (tail.length === 0 && patch.type === 'unset') {
    return omit(nextValue, head)
  }

  nextValue[head] = applyPatch(nextValue[head], {
    ...patch,
    path: tail,
  }) as JSONValue

  return nextValue
}
