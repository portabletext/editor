import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import type {
  Ancestor,
  Descendant,
  Element,
  Node,
  Path,
  Text,
} from '../interfaces'
import {getNode} from '../node/get-node'
import {isObjectNode} from '../node/is-object-node'
import {isText} from '../text/is-text'

export const insertChildren = <T>(
  xs: T[],
  index: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index)]

export const replaceChildren = <T>(
  xs: T[],
  index: number,
  removeCount: number,
  ...newValues: T[]
) => [...xs.slice(0, index), ...newValues, ...xs.slice(index + removeCount)]

export const removeChildren = replaceChildren

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Descendant>(
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const node = getNode(root, path, schema) as N
  const slicedPath = path.slice()
  let modifiedNode: Node = f(node)

  while (slicedPath.length > 1) {
    const index = slicedPath.pop()!
    const ancestorNode = getNode(root, slicedPath, schema) as Ancestor

    modifiedNode = {
      ...ancestorNode,
      children: replaceChildren(ancestorNode.children, index, 1, modifiedNode),
    }
  }

  const index = slicedPath.pop()!
  root.children = replaceChildren(root.children, index, 1, modifiedNode)
}

/**
 * Replace the children of a node, replacing all ancestors
 */
export const modifyChildren = (
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (children: Descendant[]) => Descendant[],
) => {
  if (path.length === 0) {
    root.children = f(root.children)
  } else {
    modifyDescendant<Element>(root, path, schema, (node) => {
      if (isText(node, schema) || isObjectNode(node, schema)) {
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${safeStringify(
            node,
          )}`,
        )
      }

      return {...node, children: f(node.children)}
    })
  }
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  root: Ancestor,
  path: Path,
  schema: EditorSchema,
  f: (leaf: Text) => Text,
) =>
  modifyDescendant(root, path, schema, (node) => {
    if (!isText(node, schema)) {
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${safeStringify(
          node,
        )}`,
      )
    }

    return f(node)
  })
