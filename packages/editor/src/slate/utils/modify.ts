import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import {getNodeChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'

export function insertChildren<T>(
  xs: T[],
  index: number,
  ...newValues: T[]
): T[] {
  const result = xs.slice()
  result.splice(index, 0, ...newValues)
  return result
}

function replaceChildren<T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
): T[] {
  const result = xs.slice()
  result.splice(index, removeCount, ...newValues)
  return result
}

export const removeChildren = replaceChildren

/**
 * Find the index of a node in an array by its _key.
 */
function findIndexByKey(children: Array<Node>, key: string): number {
  return children.findIndex((child) => child._key === key)
}

/**
 * Extract the keyed segments from a path (skipping field name strings).
 */
function getKeyedSegments(path: Path): Array<{_key: string}> {
  return path.filter(isKeyedSegment)
}

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Node>(
  editor: Editor,
  path: Path,
  f: (node: N) => N,
): void => {
  if (path.length === 0) {
    return
  }

  const context = {
    schema: editor.schema,
    editableTypes: editor.editableTypes,
  }
  const nodeEntry = getNode(
    {
      ...context,
      value: editor.children,
      blockIndexMap: editor.blockIndexMap,
    },
    path,
  )
  if (!nodeEntry) {
    return
  }
  const node = nodeEntry.node
  let modifiedNode: Node = f(node as N)

  // Walk down from the root to collect the child field name at each level.
  // This is needed to rebuild ancestors using the correct field (e.g. 'rows',
  // 'cells', 'content') instead of always assuming 'children'.
  // Use the resolved path from getNode which converts numeric segments to keyed.
  // Also track original numeric indices for segments that were numeric in the input path,
  // since keyed lookup is ambiguous for duplicate keys.
  const keyedSegments = getKeyedSegments(nodeEntry.path)
  const numericIndices = new Map<number, number>()
  {
    let keyedIdx = 0
    for (const segment of path) {
      if (typeof segment === 'number') {
        numericIndices.set(keyedIdx, segment)
        keyedIdx++
      } else if (isKeyedSegment(segment)) {
        keyedIdx++
      }
    }
  }
  const fieldNames: string[] = []
  {
    let currentNode: Node | {value: Array<Node>} = {value: editor.children}
    let scopePath = ''

    for (let i = 0; i < keyedSegments.length; i++) {
      const result = getNodeChildren(context, currentNode, scopePath)
      if (!result) {
        return
      }
      fieldNames.push(result.fieldName)
      // Use numeric index when available (handles duplicate keys where
      // keyed lookup would find the wrong sibling).
      const numericIndex = numericIndices.get(i)
      const child =
        numericIndex !== undefined
          ? result.children[numericIndex]
          : result.children.find((c) => c._key === keyedSegments[i]!._key)
      if (!child) {
        return
      }
      currentNode = child
      scopePath = result.scopePath
    }
  }

  // Rebuild ancestors from the target node back up to the root.
  // keyedSegments[0] is the top-level block, keyedSegments[last] is the target.
  // We walk backwards, replacing each ancestor's child with the modified node.
  for (let level = keyedSegments.length - 2; level >= 0; level--) {
    const childKey = keyedSegments[level + 1]!._key
    const fieldName = fieldNames[level + 1]!

    // Build ancestor path from the original path by finding the segment
    // at the given keyed level. We count non-string segments to map from
    // keyed level to original path index.
    let ancestorPathEnd = -1
    let keyedCount = 0
    for (let pi = 0; pi < path.length; pi++) {
      if (typeof path[pi] !== 'string') {
        if (keyedCount === level) {
          ancestorPathEnd = pi + 1
          break
        }
        keyedCount++
      }
    }
    const ancestorPath =
      ancestorPathEnd > 0 ? path.slice(0, ancestorPathEnd) : []

    const ancestorEntry = getNode(
      {
        ...context,
        value: editor.children,
        blockIndexMap: editor.blockIndexMap,
      },
      ancestorPath,
    )
    if (!ancestorEntry) {
      return
    }
    const ancestorNode = ancestorEntry.node
    const ancestorRecord = ancestorNode as Record<string, unknown>
    const currentChildren = Array.isArray(ancestorRecord[fieldName])
      ? (ancestorRecord[fieldName] as Node[])
      : []

    // Use numeric index if the original path had a number at this level,
    // since keyed lookup is ambiguous for duplicate keys.
    const originalNumericIndex = numericIndices.get(level + 1)
    const childIndex =
      originalNumericIndex !== undefined
        ? originalNumericIndex
        : findIndexByKey(currentChildren, childKey)
    if (childIndex === -1) {
      return
    }

    modifiedNode = {
      ...ancestorNode,
      [fieldName]: replaceChildren(
        currentChildren,
        childIndex,
        1,
        modifiedNode,
      ),
    }
  }

  let rootIndex: number
  const rootNumericIndex = numericIndices.get(0)
  if (rootNumericIndex !== undefined) {
    rootIndex = rootNumericIndex
  } else if (keyedSegments.length > 0) {
    const rootKey = keyedSegments[0]!._key
    if (
      editor.blockIndexMap.size === editor.children.length &&
      editor.blockIndexMap.has(rootKey)
    ) {
      rootIndex = editor.blockIndexMap.get(rootKey)!
    } else {
      rootIndex = findIndexByKey(editor.children, rootKey)
    }
  } else {
    const firstSegment = path[0]
    rootIndex = typeof firstSegment === 'number' ? firstSegment : -1
  }
  if (rootIndex === -1 || rootIndex >= editor.children.length) {
    return
  }
  ;(editor as {children: Node[]}).children = replaceChildren(
    editor.children,
    rootIndex,
    1,
    modifiedNode,
  )
}

/**
 * Replace the children of a node, replacing all ancestors.
 *
 * When path is empty, modifies the editor's children directly.
 * When path points to a node, resolves the correct child field name
 * via getNodeChildren and modifies that field.
 */
export const modifyChildren = (
  editor: Editor,
  path: Path,
  f: (children: Node[]) => Node[],
) => {
  if (path.length === 0) {
    ;(editor as {children: Node[]}).children = f(editor.children)
  } else {
    const context = {
      schema: editor.schema,
      editableTypes: editor.editableTypes,
    }

    const nodeEntry = getNode(
      {
        ...context,
        value: editor.children,
        blockIndexMap: editor.blockIndexMap,
      },
      path,
    )
    if (!nodeEntry) {
      return
    }

    // Walk the path to build scope context for nested container types.
    const keyedSegments = getKeyedSegments(nodeEntry.path)
    let scopePath = ''
    {
      let currentNode: Node | {value: Array<Node>} = {value: editor.children}
      for (let i = 0; i < keyedSegments.length; i++) {
        const result = getNodeChildren(context, currentNode, scopePath)
        if (!result) {
          break
        }
        const child = result.children.find(
          (c) => c._key === keyedSegments[i]!._key,
        )
        if (!child) {
          break
        }
        scopePath = result.scopePath
        currentNode = child
      }
    }

    const childInfo = getNodeChildren(context, nodeEntry.node, scopePath)
    const fieldName = childInfo?.fieldName ?? 'children'

    modifyDescendant(editor, path, (node) => {
      const record = node as Record<string, unknown>
      const currentChildren = Array.isArray(record[fieldName])
        ? (record[fieldName] as Node[])
        : []
      return {
        ...node,
        [fieldName]: f(currentChildren),
      }
    })
  }
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  editor: Editor,
  path: Path,
  f: (leaf: PortableTextSpan) => PortableTextSpan,
) =>
  modifyDescendant(editor, path, (node) => {
    if (!isSpan({schema: editor.schema}, node)) {
      return node
    }

    return f(node)
  })
