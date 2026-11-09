import {isSpan, isTextBlock} from '@portabletext/schema'
import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  cleanupEfficiency,
  makeDiff,
} from '@sanity/diff-match-patch'
import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import type {
  Containers,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {getContainerChildren} from '../traversal/get-container-children'
import {isDeepEqual} from './equality'

type ReconcileContext = {
  schema: EditorSchema
  containers: Containers
}

/**
 * The operations that change `current` into `next`, in the order they apply
 * to the live tree, one pass.
 *
 * Siblings are matched by `_key` and `_type`, at every depth: the root, a
 * text block's children and the child array of every registered container.
 * A match is updated in place: its properties are set and a span's `text`
 * changes by text edits. A key that is gone, or whose type changed, is
 * removed and the new node inserted. Siblings that keep their key are never
 * touched by an operation on another sibling. An array that repeats a key
 * has no single node to match, so it is matched by index.
 */
export function reconcileValue(
  context: ReconcileContext & {
    current: ReadonlyArray<Node>
    next: ReadonlyArray<Node>
  },
): Array<EngineOperation> {
  const operations: Array<EngineOperation> = []

  reconcileChildren(
    context,
    context.current,
    context.next,
    [],
    undefined,
    operations,
  )

  return operations
}

function reconcileChildren(
  context: ReconcileContext,
  current: ReadonlyArray<Node>,
  next: ReadonlyArray<Node>,
  fieldPath: Path,
  parent: RegisteredContainer | undefined,
  operations: Array<EngineOperation>,
): void {
  const byIndex = hasRepeatedKey(current) || hasRepeatedKey(next)
  const nextKeys = new Set(next.map((node) => node._key))
  const currentByKey = new Map(current.map((node) => [node._key, node]))

  // What stays, in its current order, after the removals below.
  const kept: Array<Node> = []

  if (byIndex) {
    for (let index = current.length - 1; index >= next.length; index--) {
      operations.push({type: 'unset', path: [...fieldPath, index]})
    }
    for (
      let index = 0;
      index < Math.min(current.length, next.length);
      index++
    ) {
      const currentNode = current[index]!
      const nextNode = next[index]!
      const path = [...fieldPath, index]

      if (!isSameNode(currentNode, nextNode)) {
        operations.push(
          {type: 'unset', path},
          {
            type: 'insert',
            path: [...fieldPath, index === 0 ? 0 : index - 1],
            node: nextNode,
            position: index === 0 ? 'before' : 'after',
          },
        )
        continue
      }

      reconcileNode(context, currentNode, nextNode, path, parent, operations)
    }
    for (let index = current.length; index < next.length; index++) {
      operations.push({
        type: 'insert',
        path: [...fieldPath, index === 0 ? 0 : index - 1],
        node: next[index]!,
        position: index === 0 ? 'before' : 'after',
      })
    }
    return
  }

  for (const node of [...current].reverse()) {
    const target = nextKeys.has(node._key)
      ? findByKey(next, node._key)
      : undefined

    if (target === undefined || !isSameNode(node, target)) {
      operations.push({
        type: 'unset',
        path: [...fieldPath, {_key: node._key}],
      })
      continue
    }

    kept.unshift(node)
  }

  // The kept siblings that already sit in the target order stay where they
  // are: the longest run of them whose target positions increase. Every other
  // kept sibling, and every new node, is inserted after the node before it in
  // the target.
  const targetIndexByKey = new Map(
    next.map((node, index) => [node._key, index]),
  )
  const staying = new Set(
    longestIncreasingRun(
      kept.map((node) => targetIndexByKey.get(node._key)!),
    ).map((position) => kept[position]!._key),
  )

  let previousKey: string | undefined

  for (const nextNode of next) {
    const currentNode = currentByKey.get(nextNode._key)
    const isKept =
      currentNode !== undefined && isSameNode(currentNode, nextNode)

    if (isKept && staying.has(nextNode._key)) {
      reconcileNode(
        context,
        currentNode,
        nextNode,
        [...fieldPath, {_key: nextNode._key}],
        parent,
        operations,
      )
      previousKey = nextNode._key
      continue
    }

    if (isKept) {
      operations.push({
        type: 'unset',
        path: [...fieldPath, {_key: nextNode._key}],
      })
    }

    operations.push(
      previousKey === undefined
        ? {
            type: 'insert',
            path: [...fieldPath, 0],
            node: nextNode,
            position: 'before',
          }
        : {
            type: 'insert',
            path: [...fieldPath, {_key: previousKey}],
            node: nextNode,
            position: 'after',
          },
    )
    previousKey = nextNode._key
  }
}

/**
 * The positions, in order, of a longest strictly increasing run in `values`.
 */
function longestIncreasingRun(values: ReadonlyArray<number>): Array<number> {
  const tails: Array<number> = []
  const previous: Array<number> = []

  for (let position = 0; position < values.length; position++) {
    let low = 0
    let high = tails.length

    while (low < high) {
      const middle = (low + high) >> 1
      if (values[tails[middle]!]! < values[position]!) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    previous[position] = low > 0 ? tails[low - 1]! : -1
    tails[low] = position
  }

  const run: Array<number> = []
  let position = tails.at(-1) ?? -1

  while (position !== -1) {
    run.unshift(position)
    position = previous[position]!
  }

  return run
}

function reconcileNode(
  context: ReconcileContext,
  current: Node,
  next: Node,
  path: Path,
  parent: RegisteredContainer | undefined,
  operations: Array<EngineOperation>,
): void {
  if (isDeepEqual(current, next)) {
    return
  }

  const currentRecord = current as Record<string, unknown>
  const nextRecord = next as Record<string, unknown>

  if (isSpan({schema: context.schema}, current)) {
    reconcileSpan(current, next, path, operations)
    return
  }

  const container = getContainerChildren(context.containers, next, parent)
  const childField = isTextBlock({schema: context.schema}, next)
    ? 'children'
    : container?.container.field.name

  for (const key of new Set([
    ...Object.keys(currentRecord),
    ...Object.keys(nextRecord),
  ])) {
    if (key === '_key' || key === childField) {
      continue
    }

    if (isDeepEqual(currentRecord[key], nextRecord[key])) {
      continue
    }

    if (key in nextRecord) {
      operations.push({
        type: 'set',
        path: [...path, key],
        value: nextRecord[key],
      })
    } else {
      operations.push({type: 'unset', path: [...path, key]})
    }
  }

  if (childField === undefined) {
    return
  }

  const currentChildren = currentRecord[childField]
  const nextChildren = nextRecord[childField]

  if (!Array.isArray(currentChildren) || !Array.isArray(nextChildren)) {
    if (!isDeepEqual(currentChildren, nextChildren)) {
      operations.push({
        type: 'set',
        path: [...path, childField],
        value: nextChildren,
      })
    }
    return
  }

  reconcileChildren(
    context,
    currentChildren as Array<Node>,
    nextChildren as Array<Node>,
    [...path, childField],
    container?.container,
    operations,
  )
}

function reconcileSpan(
  current: Node,
  next: Node,
  path: Path,
  operations: Array<EngineOperation>,
): void {
  const currentRecord = current as Record<string, unknown>
  const nextRecord = next as Record<string, unknown>

  for (const key of new Set([
    ...Object.keys(currentRecord),
    ...Object.keys(nextRecord),
  ])) {
    if (key === '_key' || key === 'text') {
      continue
    }

    if (isDeepEqual(currentRecord[key], nextRecord[key])) {
      continue
    }

    if (key in nextRecord) {
      operations.push({
        type: 'set',
        path: [...path, key],
        value: nextRecord[key],
      })
    } else {
      operations.push({type: 'unset', path: [...path, key]})
    }
  }

  const currentText = currentRecord['text']
  const nextText = nextRecord['text']

  if (
    typeof currentText !== 'string' ||
    typeof nextText !== 'string' ||
    currentText === nextText
  ) {
    return
  }

  let offset = 0

  for (const [diffType, text] of cleanupEfficiency(
    makeDiff(currentText, nextText),
    5,
  )) {
    if (diffType === DIFF_INSERT) {
      operations.push({type: 'insert.text', path, offset, text})
      offset += text.length
    } else if (diffType === DIFF_DELETE) {
      operations.push({type: 'remove.text', path, offset, text})
    } else if (diffType === DIFF_EQUAL) {
      offset += text.length
    }
  }
}

function isSameNode(current: Node, next: Node): boolean {
  return current._key === next._key && current._type === next._type
}

function findByKey(nodes: ReadonlyArray<Node>, key: string): Node | undefined {
  return nodes.find((node) => node._key === key)
}

function hasRepeatedKey(nodes: ReadonlyArray<Node>): boolean {
  const keys = new Set<string>()

  for (const node of nodes) {
    if (keys.has(node._key)) {
      return true
    }
    keys.add(node._key)
  }

  return false
}
