import {
  applyAll,
  type Patch,
  type Path,
  type PathSegment,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * Applies patches the way Content Lake does: a patch whose target is gone is
 * a no-op. `applyAll` already skips a keyed segment it can't find inside an
 * existing array, but throws when a path runs into a missing field, so those
 * patches are skipped here. A path that runs through a string, number or
 * boolean can't be evaluated at all, and throws. Duplicate keys are stored
 * as sent.
 */
export function applyWithContentLakeSemantics(
  value: Array<PortableTextBlock> | undefined,
  patches: Array<Patch>,
): Array<PortableTextBlock> | undefined {
  return patches.reduce<Array<PortableTextBlock> | undefined>(
    (currentValue, patch) =>
      hasContainer(currentValue, patch.path)
        ? applyAll(currentValue, [patch])
        : currentValue,
    value,
  )
}

/**
 * Follows a path into a value. Returns `undefined` when any segment is
 * missing.
 */
export function resolvePath(value: unknown, path: Path): unknown {
  let current = value

  for (const segment of path) {
    current = resolveSegment(current, segment)
  }

  return current
}

/**
 * Whether a patch has something to act on: the item it names, or a field
 * inside an existing object. An `insert` names the item it goes next to.
 * Throws, like `applyWithContentLakeSemantics`, for a path through a
 * primitive.
 */
export function hasTarget(
  value: Array<PortableTextBlock> | undefined,
  patch: Patch,
): boolean {
  if (!hasContainer(value, patch.path)) {
    return false
  }

  const last = patch.path.at(-1)

  if (last === undefined || typeof last === 'string') {
    return true
  }

  return resolvePath(value, patch.path) !== undefined
}

function hasContainer(value: unknown, path: Path): boolean {
  if (path.length === 0) {
    return true
  }

  let container = value

  for (const segment of path.slice(0, -1)) {
    if (container === undefined || container === null) {
      return false
    }

    assertTraversable(container, segment)
    container = resolveSegment(container, segment)
  }

  if (container === undefined || container === null) {
    return false
  }

  assertTraversable(container, path[path.length - 1])

  return true
}

function assertTraversable(container: unknown, segment: PathSegment) {
  if (typeof container !== 'object') {
    throw new Error(
      `Can't follow ${JSON.stringify(segment)} into a ${typeof container}`,
    )
  }
}

function resolveSegment(container: unknown, segment: PathSegment): unknown {
  if (Array.isArray(container)) {
    if (typeof segment === 'number') {
      return container[segment]
    }

    if (typeof segment === 'object' && '_key' in segment) {
      return container.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          '_key' in item &&
          item._key === segment._key,
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
