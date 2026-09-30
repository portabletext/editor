import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {
  EngineOperation,
  InsertOperation,
  InsertTextOperation,
  RemoveTextOperation,
} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import {hasUsableKey} from '../paths/node-segment'
import {getSpan} from '../traversal/get-span'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {isRecord} from '../utils/asserters'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

export function operationToPatches(
  operation: EngineOperation,
  {
    beforeValue,
    afterSnapshot,
  }: {
    beforeValue: Array<PortableTextBlock>
    afterSnapshot: TraversalSnapshot
  },
): Array<Patch> {
  switch (operation.type) {
    case 'insert.text':
    case 'remove.text':
      return textPatch(afterSnapshot, operation, beforeValue)
    case 'insert':
      return insertNodePatch(operation, beforeValue)
    case 'set':
      return [
        set(operation.value, toKeyedPatchPath(beforeValue, operation.path)),
      ]
    case 'unset':
      return [unset(toKeyedPatchPath(beforeValue, operation.path))]
    case 'set.selection':
      return []
  }
}

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
    ...toKeyedPatchPath(beforeValue, operation.path),
    'text',
  ])
  return patch.value.length ? [patch] : []
}

export function insertNodePatch(
  operation: InsertOperation,
  beforeValue: Array<PortableTextBlock>,
): Array<Patch> {
  const path = toKeyedPatchPath(beforeValue, operation.path)
  const arrayFieldPath = path.slice(0, -1)

  if (arrayFieldPath.length === 0) {
    return [insert([operation.node], operation.position, path)]
  }

  return [
    setIfMissing([], arrayFieldPath),
    insert([operation.node], operation.position, path),
  ]
}

/**
 * Counts of each `_key` per array, so a caller resolving many paths against
 * the same value (the dirty paths of one operation) counts every array once.
 * `null` marks an array that holds a non-object, which no key can address.
 */
export type KeyCountCache = Map<Array<unknown>, Map<string, number> | null>

export function toKeyedPatchPath(
  value: unknown,
  path: Path,
  keyCounts?: KeyCountCache,
): Path {
  if (!path.some((segment) => typeof segment === 'number')) {
    return path
  }

  const keyedPath: Path = []
  let current: unknown = value

  for (const segment of path) {
    if (typeof segment === 'number') {
      const elements: Array<unknown> = Array.isArray(current) ? current : []
      const element = elements[segment]
      const key = isRecord(element) ? element['_key'] : undefined
      keyedPath.push(
        hasUsableKey(key) && isAddressableByKey(elements, key, keyCounts)
          ? {_key: key}
          : segment,
      )
      current = element
      continue
    }

    keyedPath.push(segment)

    if (typeof segment === 'string') {
      current = isRecord(current) ? current[segment] : undefined
      continue
    }

    if (isKeyedSegment(segment)) {
      current = Array.isArray(current)
        ? current.find(
            (element) => isRecord(element) && element['_key'] === segment._key,
          )
        : undefined
      continue
    }

    current = undefined
  }

  return keyedPath
}

function isAddressableByKey(
  elements: Array<unknown>,
  key: string,
  keyCounts?: KeyCountCache,
): boolean {
  const cached = keyCounts?.get(elements)

  if (cached !== undefined) {
    return cached?.get(key) === 1
  }

  let counts: Map<string, number> | null = new Map()

  for (const element of elements) {
    if (!isRecord(element)) {
      counts = null
      break
    }
    const elementKey = element['_key']
    if (hasUsableKey(elementKey)) {
      counts.set(elementKey, (counts.get(elementKey) ?? 0) + 1)
    }
  }

  keyCounts?.set(elements, counts)

  return counts?.get(key) === 1
}
