import {applyAll, type Patch, type PathSegment} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

export type Value = Array<PortableTextBlock> | undefined

export function applyLocal(
  value: Value,
  patches: Array<Patch>,
): {value: Value; dropped: Array<Patch>} {
  let current = value
  const dropped: Array<Patch> = []

  for (const patch of patches) {
    const resolved = resolveTarget(current, patch)

    if (resolved.type !== 'found') {
      dropped.push(patch)
      continue
    }

    try {
      current = applyAll(current, [resolved.patch])
    } catch {
      dropped.push(patch)
    }
  }

  return {value: current, dropped}
}

/** `undefined` when Sanity would have refused the transaction. */
export function applyRemote(
  value: Value,
  patches: Array<Patch>,
): {value: Value} | undefined {
  let current = value

  for (const patch of patches) {
    const resolved = resolveTarget(current, patch)

    if (resolved.type === 'absent') {
      continue
    }

    if (resolved.type === 'wrong type') {
      return undefined
    }

    try {
      current = applyAll(current, [resolved.patch])
    } catch {
      return undefined
    }
  }

  return {value: current}
}

/**
 * The patch with every index counted from the start, as `applyAll` reads
 * them: Sanity counts a negative index from the end, and a patch at an
 * index past either end leaves the value unchanged.
 */
function resolveTarget(
  value: unknown,
  patch: Patch,
): {type: 'found'; patch: Patch} | {type: 'absent'} | {type: 'wrong type'} {
  const path: Array<PathSegment> = []
  let target: unknown = value

  for (const segment of patch.path) {
    if (typeof target !== 'object' || target === null) {
      return {type: 'absent'}
    }

    if (typeof segment === 'number') {
      if (!Array.isArray(target)) {
        return {type: 'absent'}
      }

      if (patch.type === 'insert' && target.length === 0) {
        path.push(0)
        target = undefined
        continue
      }

      const index = segment < 0 ? target.length + segment : segment

      if (index < 0 || index >= target.length) {
        return {type: 'absent'}
      }

      path.push(index)
      target = target[index]
      continue
    }

    if (Array.isArray(target) === (typeof segment === 'string')) {
      return {type: 'absent'}
    }

    path.push(segment)
    target = resolveSegment(target, segment)

    if (typeof segment !== 'string' && target === undefined) {
      return {type: 'absent'}
    }
  }

  if (patch.type === 'diffMatchPatch') {
    if (target === undefined) {
      return {type: 'absent'}
    }

    if (typeof target !== 'string') {
      return {type: 'wrong type'}
    }
  }

  return {type: 'found', patch: {...patch, path}}
}

function resolveSegment(container: unknown, segment: PathSegment): unknown {
  if (Array.isArray(container)) {
    if (typeof segment === 'object' && '_key' in segment) {
      return container.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          Reflect.get(item, '_key') === segment._key,
      )
    }

    return undefined
  }

  if (
    typeof container === 'object' &&
    container !== null &&
    typeof segment === 'string'
  ) {
    return Reflect.get(container, segment)
  }

  return undefined
}

export function isEqual(valueA: unknown, valueB: unknown): boolean {
  if (valueA === valueB) {
    return true
  }

  if (
    typeof valueA !== 'object' ||
    typeof valueB !== 'object' ||
    valueA === null ||
    valueB === null ||
    Array.isArray(valueA) !== Array.isArray(valueB)
  ) {
    return false
  }

  const keysA = Object.keys(valueA)
  const keysB = Object.keys(valueB)

  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key) =>
        Object.hasOwn(valueB, key) &&
        isEqual(Reflect.get(valueA, key), Reflect.get(valueB, key)),
    )
  )
}
