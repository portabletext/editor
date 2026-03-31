import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {getNodeChildren} from '../../node-traversal/get-children'
import {getNode} from '../../node-traversal/get-node'
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
  const nodeEntry = getNode({...context, value: typedRoot.children}, path)
  if (!nodeEntry) {
    return
  }
  const node = nodeEntry.node
  const slicedPath = path.slice()
  let modifiedNode: Node = f(node as N)

  // Walk down from the root to collect the child field name at each level.
  // This is needed to rebuild ancestors using the correct field (e.g. 'rows',
  // 'cells', 'content') instead of always assuming 'children'.
  const fieldNames: string[] = []
  {
    let currentNode: Node | {value: Array<Node>} = {value: typedRoot.children}
    let scope: Parameters<typeof getNodeChildren>[2]
    let scopePath = ''

    for (let i = 0; i < path.length; i++) {
      const result = getNodeChildren(context, currentNode, scope, scopePath)
      if (!result) {
        return
      }
      fieldNames.push(result.fieldName)
      const child = result.children.at(path.at(i)!)
      if (!child) {
        return
      }
      currentNode = child
      scope = result.scope
      scopePath = result.scopePath
    }
  }

  while (slicedPath.length > 1) {
    const index = slicedPath.pop()!
    const level = slicedPath.length
    const fieldName = fieldNames.at(level)!
    const ancestorEntry = getNode(
      {...context, value: typedRoot.children},
      slicedPath,
    )
    if (!ancestorEntry) {
      return
    }
    const ancestorNode = ancestorEntry.node
    const ancestorRecord = ancestorNode as Record<string, unknown>
    const currentChildren = Array.isArray(ancestorRecord[fieldName])
      ? (ancestorRecord[fieldName] as Node[])
      : []

    modifiedNode = {
      ...ancestorNode,
      [fieldName]: replaceChildren(currentChildren, index, 1, modifiedNode),
    }
  }

  const index = slicedPath.pop()!
  const newRootChildren = replaceChildren(
    isEditor(root)
      ? root.children
      : isTextBlock({schema}, root)
        ? root.children
        : [],
    index,
    1,
    modifiedNode,
  )
  ;(root as {children: Node[]}).children = newRootChildren
}

/**
 * Replace the children of a node, replacing all ancestors
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
    modifyDescendant(root, path, schema, (node) => {
      return {
        ...node,
        children: f(isTextBlock({schema}, node) ? node.children : []),
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
