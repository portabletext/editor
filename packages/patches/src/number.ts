import type {Patch} from './types'

export function applyPatchToNumber(value: number, patch: Patch) {
  if (patch.path.length > 0) {
    throw new Error(
      `Cannot apply deep operations on primitive values. Received patch with type "${
        patch.type
      }" and path "${patch.path
        .map((path: any) => JSON.stringify(path))
        .join('.')} that targeted the value "${JSON.stringify(value)}"`,
    )
  }

  if (patch.type === 'set') {
    return patch.value
  }

  if (patch.type === 'setIfMissing') {
    return value === undefined ? patch.value : value
  }

  if (patch.type === 'unset') {
    return undefined
  }

  if (patch.type === 'inc') {
    if (typeof patch.value !== 'number') {
      throw new Error('Cannot increment with a non-number')
    }

    return value + patch.value
  }

  if (patch.type === 'dec') {
    if (typeof patch.value !== 'number') {
      throw new Error('Cannot decrement with a non-number')
    }

    return value - patch.value
  }

  throw new Error(
    `Received patch of unsupported type: "${JSON.stringify(
      patch.type,
    )}" for number. This is most likely a bug.`,
  )
}
