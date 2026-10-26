import type {Patch, PathSegment} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {applyPatches, parsePatch} from '@sanity/diff-match-patch'

type Document = Array<PortableTextBlock> | undefined

/**
 * Sanity's patch semantics for the patches the scenarios use, written
 * apart from io's own so the scenarios check io against it: a keyed or
 * indexed path that finds nothing is a no-op, a negative index counts from
 * the end, and a `diffMatchPatch` on something other than a string fails.
 */
export function applyOnServer(
  document: Document,
  patches: Array<Patch>,
): Document {
  let current: unknown = document

  for (const patch of patches) {
    current = applyAt(current, patch.path, patch)
  }

  return current as Document
}

function applyAt(
  node: unknown,
  path: Array<PathSegment>,
  patch: Patch,
): unknown {
  if (path.length === 0) {
    return applyHere(node, patch)
  }

  const [segment, ...rest] = path

  if (Array.isArray(node)) {
    if (rest.length === 0 && patch.type === 'insert' && node.length === 0) {
      return [...patch.items]
    }

    const index = indexOf(node, segment)

    if (index === undefined) {
      return node
    }

    if (rest.length === 0 && patch.type === 'insert') {
      const at = patch.position === 'after' ? index + 1 : index
      return [...node.slice(0, at), ...patch.items, ...node.slice(at)]
    }

    if (rest.length === 0 && patch.type === 'unset') {
      return node.filter((_, itemIndex) => itemIndex !== index)
    }

    return node.map((item, itemIndex) =>
      itemIndex === index ? applyAt(item, rest, patch) : item,
    )
  }

  if (
    typeof node === 'object' &&
    node !== null &&
    typeof segment === 'string'
  ) {
    const field: unknown = Reflect.get(node, segment)

    if (rest.length === 0 && patch.type === 'unset') {
      const {[segment]: _removed, ...remaining} = node as Record<
        string,
        unknown
      >
      return remaining
    }

    if (field === undefined && rest.length > 0) {
      return node
    }

    if (field === undefined && patch.type === 'diffMatchPatch') {
      return node
    }

    return {...node, [segment]: applyAt(field, rest, patch)}
  }

  return node
}

function applyHere(node: unknown, patch: Patch): unknown {
  switch (patch.type) {
    case 'set':
      return patch.value
    case 'unset':
      return undefined
    case 'diffMatchPatch': {
      if (typeof node !== 'string') {
        throw new Error('`diffMatchPatch` on something other than a string')
      }

      return applyPatches(parsePatch(patch.value), node)[0]
    }
    default:
      throw new Error(`The fake server does not apply \`${patch.type}\` here`)
  }
}

function indexOf(
  list: Array<unknown>,
  segment: PathSegment | undefined,
): number | undefined {
  if (typeof segment === 'number') {
    const index = segment < 0 ? list.length + segment : segment
    return index >= 0 && index < list.length ? index : undefined
  }

  if (typeof segment === 'object' && !Array.isArray(segment)) {
    const index = list.findIndex(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        Reflect.get(item, '_key') === segment._key,
    )
    return index === -1 ? undefined : index
  }

  return undefined
}
