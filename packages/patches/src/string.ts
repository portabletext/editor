import {applyPatches, parsePatch} from '@sanity/diff-match-patch'
import type {Patch} from './types'

export function applyPatchToString(value: string, patch: Patch) {
  if (patch.path.length > 0) {
    throw new Error(
      `Cannot apply deep operations on string values. Received patch with type "${
        patch.type
      }" and path "${patch.path.join('.')} that targeted the value "${JSON.stringify(value)}"`,
    )
  }

  if (patch.type === 'diffMatchPatch') {
    const [result] = applyPatches(parsePatch(patch.value), value, {
      allowExceedingIndices: true,
    })
    return result
  }

  if (patch.type === 'setIfMissing') {
    return value === undefined ? patch.value : value
  }

  if (patch.type === 'set') {
    return patch.value
  }

  if (patch.type === 'unset') {
    return undefined
  }

  throw new Error(
    `Received patch of unsupported type: "${JSON.stringify(
      patch.type,
    )}" for string. This is most likely a bug.`,
  )
}
