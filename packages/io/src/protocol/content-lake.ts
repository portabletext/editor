import {
  applyAll,
  set,
  type Patch,
  type Path,
  type PathSegment,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

/**
 * Applies patches the way Content Lake does: a patch whose target is gone is
 * a no-op. `applyAll` already skips a keyed segment it can't find inside an
 * existing array, but throws when a path runs into a missing field, so those
 * patches are skipped here. A `set` through a string, number or boolean
 * replaces it with the structure the rest of the path names, and any other
 * patch through one selects nothing. A `set` replaces an object or a list
 * with whatever it carries, a string or a number included, which
 * `applyAll` refuses. A `diffMatchPatch` on anything but a string fails, as
 * does one on a missing field that isn't keyed. Duplicate keys are stored
 * as sent.
 */
export function applyWithContentLakeSemantics(
  value: Array<PortableTextBlock> | undefined,
  patches: Array<Patch>,
): Array<PortableTextBlock> | undefined {
  return patches.reduce<Array<PortableTextBlock> | undefined>(
    (currentValue, patch) => applyPatch(currentValue, patch),
    value,
  )
}

function applyPatch(
  value: Array<PortableTextBlock> | undefined,
  patch: Patch,
): Array<PortableTextBlock> | undefined {
  const location = locate(value, patch.path)

  if (location.type === 'missing') {
    return value
  }

  if (location.type === 'primitive') {
    if (patch.type === 'diffMatchPatch') {
      throw new Error(
        `Can't apply a \`diffMatchPatch\` through a ${location.primitiveType}`,
      )
    }

    const replacement =
      patch.type === 'set'
        ? nestUnder(patch.path.slice(location.depth), patch.value)
        : undefined

    return replacement === undefined
      ? value
      : applyAll(value, [
          set(replacement.value, patch.path.slice(0, location.depth)),
        ])
  }

  if (patch.type === 'set' && patch.path.length > 0) {
    const target = resolvePath(value, patch.path)

    if (isOfOtherKind(target, patch.value)) {
      return replaceAt(value, patch.path, patch.value)
    }
  }

  if (patch.type === 'diffMatchPatch') {
    const target = resolvePath(value, patch.path)
    const last = patch.path.at(-1)

    if (target === undefined && isKeyedSegment(last)) {
      return value
    }

    if (typeof target !== 'string') {
      throw new Error(
        `Can't apply a \`diffMatchPatch\` to ${JSON.stringify(target ?? null)}`,
      )
    }
  }

  return applyAll(value, [patch])
}

/**
 * Whether `target` is an object or a list and `replacement` isn't the same
 * kind, which `applyAll` refuses to `set`.
 */
function isOfOtherKind(target: unknown, replacement: unknown): boolean {
  if (typeof target !== 'object' || target === null) {
    return false
  }

  return Array.isArray(target)
    ? !Array.isArray(replacement)
    : typeof replacement !== 'object' ||
        replacement === null ||
        Array.isArray(replacement)
}

/**
 * Replaces the item or field at `path` in its parent, and sets the parent,
 * which keeps its kind, in its place.
 */
function replaceAt(
  value: Array<PortableTextBlock> | undefined,
  path: Path,
  replacement: unknown,
): Array<PortableTextBlock> | undefined {
  const parentPath = path.slice(0, -1)
  const parent = resolvePath(value, parentPath)
  const last = path[path.length - 1]
  let nextParent: unknown

  if (Array.isArray(parent)) {
    const index =
      typeof last === 'number'
        ? last
        : parent.findIndex(
            (item: unknown) =>
              typeof last === 'object' &&
              !Array.isArray(last) &&
              typeof item === 'object' &&
              item !== null &&
              Reflect.get(item, '_key') === last._key,
          )
    nextParent = parent.map((item: unknown, itemIndex) =>
      itemIndex === index ? replacement : item,
    )
  } else if (typeof parent === 'object' && parent !== null) {
    nextParent = {...parent, [String(last)]: replacement}
  }

  return parentPath.length === 0
    ? applyAll(value, [set(nextParent, [])])
    : applyPatch(value, set(nextParent, parentPath))
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
 * inside an existing object. An `insert` names the item it goes next to. A
 * `set` through a primitive acts on it, and any other patch through one
 * selects nothing.
 */
export function hasTarget(
  value: Array<PortableTextBlock> | undefined,
  patch: Patch,
): boolean {
  const location = locate(value, patch.path)

  if (location.type !== 'reachable') {
    return location.type === 'primitive' && patch.type === 'set'
  }

  const last = patch.path.at(-1)

  if (last === undefined || typeof last === 'string') {
    return true
  }

  return resolvePath(value, patch.path) !== undefined
}

/**
 * Walks the containers a path runs through: `reachable` when each one is an
 * object or a list, `missing` when one isn't there, and `primitive` when the
 * value at `path.slice(0, depth)` is a string, number or boolean the rest of
 * the path runs into.
 */
function locate(
  value: unknown,
  path: Path,
):
  | {type: 'reachable'}
  | {type: 'missing'}
  | {type: 'primitive'; depth: number; primitiveType: string} {
  let container = value

  for (const [depth, segment] of path.entries()) {
    if (container === undefined || container === null) {
      return {type: 'missing'}
    }

    if (typeof container !== 'object') {
      return {type: 'primitive', depth, primitiveType: typeof container}
    }

    container = resolveSegment(container, segment)
  }

  return {type: 'reachable'}
}

/**
 * The object a path of field names builds around a value, or `undefined`
 * when the path has a keyed or index segment, which selects nothing.
 */
function nestUnder(path: Path, value: unknown): {value: unknown} | undefined {
  let nested: unknown = value

  for (const segment of [...path].reverse()) {
    if (typeof segment !== 'string') {
      return undefined
    }

    nested = {[segment]: nested}
  }

  return {value: nested}
}

function isKeyedSegment(segment: PathSegment | undefined): boolean {
  return typeof segment === 'object' && !Array.isArray(segment)
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
