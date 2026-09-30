import type {JSONValue, Patch} from './types'

export function applyPatchToUnknown(
  value: unknown,
  patch: Patch,
): JSONValue | undefined {
  if (patch.path.length > 0 && (value === undefined || value === null)) {
    // Content Lake selects nothing for a path into a missing value and
    // applies the patch as a no-op, without failing the transaction.
    return value as JSONValue | undefined
  }

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
    return value === undefined ? patch.value : (value as JSONValue)
  }

  if (patch.type === 'unset') {
    return undefined
  }

  throw new Error(
    `Received patch of unsupported type: "${JSON.stringify(
      patch.type,
    )}" for primitives. This is most likely a bug.`,
  )
}
