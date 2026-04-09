import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {getNodeChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import {isEditor} from '../editor/is-editor'
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
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (node: N) => N,
): void => {
  if (path.length === 0) {
    return
  }

  const editableTypes = isEditor(root) ? root.editableTypes : new Set<string>()
  const context = {schema, editableTypes}
  const typedRoot = isEditor(root)
    ? root
    : isTextBlock({schema}, root)
      ? root
      : undefined

  if (!typedRoot) {
    return
  }
  const blockIndexMap = isEditor(root) ? root.blockIndexMap : undefined
  const nodeEntry = getNode(
    {...context, value: typedRoot.children, blockIndexMap},
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
    let currentNode: Node | {value: Array<Node>} = {value: typedRoot.children}
    let scope: Parameters<typeof getNodeChildren>[2]
    let scopePath = ''

    for (let i = 0; i < keyedSegments.length; i++) {
      const result = getNodeChildren(context, currentNode, scope, scopePath)
      if (!result) {
        return
      }
      fieldNames.push(result.fieldName)
      const child = result.children.find(
        (c) => c._key === keyedSegments[i]!._key,
      )
      if (!child) {
        return
      }
      currentNode = child
      scope = result.scope
      scopePath = result.scopePath
    }
  }

  // Rebuild ancestors from the target node back up to the root.
  // keyedSegments[0] is the top-level block, keyedSegments[last] is the target.
  // We walk backwards, replacing each ancestor's child with the modified node.
  for (let level = keyedSegments.length - 2; level >= 0; level--) {
    const childKey = keyedSegments[level + 1]!._key
    const fieldName = fieldNames[level + 1]!
    const ancestorPath = path.slice(0, path.indexOf(keyedSegments[level]!) + 1)
    const ancestorEntry = getNode(
      {...context, value: typedRoot.children, blockIndexMap},
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

  const rootChildren = isEditor(root)
    ? root.children
    : isTextBlock({schema}, root)
      ? root.children
      : []

  let rootIndex: number
  const rootNumericIndex = numericIndices.get(0)
  if (rootNumericIndex !== undefined) {
    rootIndex = rootNumericIndex
  } else if (keyedSegments.length > 0) {
    const rootKey = keyedSegments[0]!._key
    if (
      isEditor(root) &&
      root.blockIndexMap.size === rootChildren.length &&
      root.blockIndexMap.has(rootKey)
    ) {
      rootIndex = root.blockIndexMap.get(rootKey)!
    } else {
      rootIndex = findIndexByKey(rootChildren, rootKey)
    }
  } else {
    const firstSegment = path[0]
    rootIndex = typeof firstSegment === 'number' ? firstSegment : -1
  }
  if (rootIndex === -1 || rootIndex >= rootChildren.length) {
    return
  }
  const newRootChildren = replaceChildren(
    rootChildren,
    rootIndex,
    1,
    modifiedNode,
  )
  ;(root as {children: Node[]}).children = newRootChildren
}

/**
 * Replace the children of a node, replacing all ancestors.
 *
 * When path is empty, modifies the root's children directly.
 * When path points to a node, resolves the correct child field name
 * via getNodeChildren and modifies that field.
 */
export const modifyChildren = (
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (children: Node[]) => Node[],
) => {
  if (path.length === 0) {
    ;(root as {children: Node[]}).children = f(
      isEditor(root)
        ? root.children
        : isTextBlock({schema}, root)
          ? root.children
          : [],
    )
  } else {
    const editableTypes = isEditor(root)
      ? root.editableTypes
      : new Set<string>()
    const context = {schema, editableTypes}
    const typedRoot = isEditor(root)
      ? root
      : isTextBlock({schema}, root)
        ? root
        : undefined

    if (!typedRoot) {
      return
    }

    const nodeEntry = getNode(
      {
        ...context,
        value: typedRoot.children,
        blockIndexMap: isEditor(root) ? root.blockIndexMap : undefined,
      },
      path,
    )
    if (!nodeEntry) {
      return
    }

    // Walk the path to build scope context for nested container types.
    const keyedSegments = getKeyedSegments(nodeEntry.path)
    let scope: Parameters<typeof getNodeChildren>[2]
    let scopePath = ''
    {
      let currentNode: Node | {value: Array<Node>} = {value: typedRoot.children}
      for (let i = 0; i < keyedSegments.length; i++) {
        const result = getNodeChildren(context, currentNode, scope, scopePath)
        if (!result) {
          break
        }
        const child = result.children.find(
          (c) => c._key === keyedSegments[i]!._key,
        )
        if (!child) {
          break
        }
        scope = result.scope
        scopePath = result.scopePath
        currentNode = child
      }
    }

    const childInfo = getNodeChildren(context, nodeEntry.node, scope, scopePath)
    const fieldName = childInfo?.fieldName ?? 'children'

    modifyDescendant(root, path, schema, (node) => {
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
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (leaf: PortableTextSpan) => PortableTextSpan,
) =>
  modifyDescendant(root, path, schema, (node) => {
    if (!isSpan({schema}, node)) {
      return node
    }

    return f(node)
  })
