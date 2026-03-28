import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import {resolveChildArrayFieldByType} from '../../schema/resolve-child-array-field'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {isObjectNode} from '../node/is-object-node'

export const insertChildren = <T>(
  xs: T[],
  index: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index)]

const replaceChildren = <T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index + removeCount)]

export const removeChildren = replaceChildren

/**
 * Walk down the tree by indexed path, resolving child fields from the schema.
 * Does not depend on editableTypes, so it can traverse into any container.
 */
function getNodeAtPath(
  schema: EditorSchema,
  rootChildren: Node[],
  path: Path,
): Node | undefined {
  let current: Node | undefined = rootChildren.at(path.at(0)!)

  for (let i = 1; i < path.length; i++) {
    if (!current) {
      return undefined
    }

    const children = getChildArray(schema, current)
    if (!children) {
      return undefined
    }

    current = children.at(path.at(i)!)
  }

  return current
}

/**
 * Get the child array for a node, resolving the correct field from the schema.
 */
function getChildArray(schema: EditorSchema, node: Node): Node[] | undefined {
  if (isTextBlock({schema}, node)) {
    return node.children as Node[]
  }

  if (isObjectNode({schema}, node)) {
    const childField = resolveChildArrayFieldByType(schema, node._type)
    if (childField) {
      const children = (node as Record<string, unknown>)[childField.name]
      if (Array.isArray(children)) {
        return children as Node[]
      }
      return []
    }
  }

  return undefined
}

/**
 * Replace a child at a given index in the correct child field for the node type.
 */
function replaceChildAtIndex(
  schema: EditorSchema,
  parentNode: Node,
  index: number,
  newChild: Node,
): Node {
  if (isTextBlock({schema}, parentNode)) {
    return {
      ...parentNode,
      children: replaceChildren(parentNode.children, index, 1, newChild),
    }
  }

  if (isObjectNode({schema}, parentNode)) {
    const childField = resolveChildArrayFieldByType(schema, parentNode._type)
    if (childField) {
      const currentChildren = (parentNode as Record<string, unknown>)[
        childField.name
      ]
      return {
        ...parentNode,
        [childField.name]: replaceChildren(
          Array.isArray(currentChildren) ? (currentChildren as Node[]) : [],
          index,
          1,
          newChild,
        ),
      }
    }
  }

  return {
    ...parentNode,
    children: replaceChildren([], index, 1, newChild),
  }
}

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Node>(
  root: Editor | Node,
  path: Path,
  schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const rootChildren = isEditor(root)
    ? root.children
    : isTextBlock({schema}, root)
      ? root.children
      : undefined

  if (!rootChildren) {
    throw new Error('Cannot modify descendant: root has no children')
  }

  // Walk down the tree to find the target node
  const node = getNodeAtPath(schema, rootChildren, path)
  if (!node) {
    throw new Error(`Cannot find a descendant at path [${path}]`)
  }

  const slicedPath = path.slice()
  let modifiedNode: Node = f(node as N)

  // Walk back up, replacing each ancestor
  while (slicedPath.length > 1) {
    const index = slicedPath.pop()!
    const ancestorNode = getNodeAtPath(schema, rootChildren, slicedPath)
    if (!ancestorNode) {
      throw new Error(`Cannot find ancestor at path [${slicedPath}]`)
    }

    modifiedNode = replaceChildAtIndex(
      schema,
      ancestorNode,
      index,
      modifiedNode,
    )
  }

  const index = slicedPath.pop()!
  ;(root as {children: Node[]}).children = replaceChildren(
    rootChildren,
    index,
    1,
    modifiedNode,
  )
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
      if (isSpan({schema}, node)) {
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${safeStringify(
            node,
          )}`,
        )
      }

      if (isTextBlock({schema}, node)) {
        return {
          ...node,
          children: f(node.children),
        }
      }

      if (isObjectNode({schema}, node)) {
        const childField = resolveChildArrayFieldByType(schema, node._type)
        if (childField) {
          const currentChildren = (node as Record<string, unknown>)[
            childField.name
          ]
          return {
            ...node,
            [childField.name]: f(
              Array.isArray(currentChildren) ? (currentChildren as Node[]) : [],
            ),
          }
        }
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${safeStringify(
            node,
          )}`,
        )
      }

      throw new Error(
        `Cannot get the element at path [${path}] because it refers to a leaf node: ${safeStringify(
          node,
        )}`,
      )
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
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${safeStringify(
          node,
        )}`,
      )
    }

    return f(node)
  })
