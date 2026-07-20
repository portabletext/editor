import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
  SetOperation,
} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {getSpan} from '../traversal/get-span'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

/**
 * Mechanical operation-to-patch representation changes ONLY. Every
 * function here maps one operation to its wire-format equivalent:
 * offset-based text edits become `diffMatchPatch` (the patch vocabulary
 * has no offset inserts), array inserts gain a defensive `setIfMissing`
 * (the stored document may lack arrays the engine state has), and
 * ensure-exists sets become `setIfMissing` (no operation vocabulary
 * carries that intent).
 *
 * Never diff sibling state to reconstruct intent here. If a patch shape
 * requires knowing more than the operation itself expresses, the
 * operation site is emitting the wrong operation; fix it there.
 */

export function textPatch(
  snapshot: TraversalSnapshot,
  operation: InsertTextOperation | RemoveTextOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const span = getSpan(snapshot, operation.path)
  if (!span) {
    return []
  }
  const beforeSnapshot: TraversalSnapshot = {
    context: {
      schema: snapshot.context.schema,
      containers: snapshot.context.containers,
      value: beforeValue as Array<Node>,
    },
    blockIndexMap: snapshot.blockIndexMap,
  }
  const prevSpan = getSpan(beforeSnapshot, operation.path)
  const patch = diffMatchPatch(prevSpan?.node.text ?? '', span.node.text, [
    ...operation.path,
    'text',
  ])
  return patch.value.length ? [patch] : []
}

export function insertNodePatch(operation: InsertOperation): Array<Patch> {
  const arrayFieldPath = operation.path.slice(0, -1)

  if (arrayFieldPath.length === 0) {
    return [insert([operation.node], operation.position, operation.path)]
  }

  return [
    setIfMissing([], arrayFieldPath),
    insert([operation.node], operation.position, operation.path),
  ]
}

export function setNodePatch(
  operation: SetOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  if (
    operation.path.at(-1) === 'markDefs' &&
    Array.isArray(operation.value) &&
    operation.value.length === 0 &&
    getValueAtPath(beforeValue, operation.path) === undefined &&
    getValueAtPath(beforeValue, operation.path.slice(0, -1)) !== undefined
  ) {
    // Normalization ensures `markDefs` exists by setting `[]` on blocks
    // that lack it, and there is no ensure-exists operation vocabulary to
    // carry that intent. Translate it here: `setIfMissing` creates the
    // property on the stored document without clobbering definitions
    // another client may have written meanwhile.
    return [setIfMissing([], operation.path)]
  }

  return [set(operation.value, operation.path)]
}

function getValueAtPath(value: unknown, path: Path): unknown {
  let current: unknown = value

  for (const segment of path) {
    if (typeof segment === 'string') {
      if (
        typeof current !== 'object' ||
        current === null ||
        Array.isArray(current)
      ) {
        return undefined
      }
      current = (current as Record<string, unknown>)[segment]
    } else if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }
      current = current[segment]
    } else if (Array.isArray(segment)) {
      // index tuples address ranges, not single values
      return undefined
    } else {
      if (!Array.isArray(current)) {
        return undefined
      }
      const key = segment._key
      current = current.find((item) => isKeyedObject(item) && item._key === key)
    }
  }

  return current
}

function isKeyedObject(value: unknown): value is {_key: string} {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_key' in value &&
    typeof (value as {_key: unknown})._key === 'string'
  )
}
