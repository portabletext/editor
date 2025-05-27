import {applyPatchToArray} from './array'
import {applyPatchToNumber} from './number'
import {applyPatchToObject} from './object'
import {applyPatchToUnknown} from './primitive'
import {applyPatchToString} from './string'
import type {JSONValue, Patch} from './types'

/** @beta */
export function applyAll<TValue>(value: TValue, patches: Array<Patch>): TValue {
  return patches.reduce(applyPatch, value) as TValue
}

export default function applyPatch(value: unknown, patch: Patch) {
  if (Array.isArray(value)) {
    return applyPatchToArray(value, patch)
  }

  if (typeof value === 'string') {
    return applyPatchToString(value, patch)
  }

  if (isObject(value)) {
    return applyPatchToObject(value, patch)
  }

  if (typeof value === 'number') {
    return applyPatchToNumber(value, patch)
  }

  return applyPatchToUnknown(value, patch)
}

function isObject(value: unknown): value is {[key: string]: JSONValue} {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
