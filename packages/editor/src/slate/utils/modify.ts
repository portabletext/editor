import type {EditorSchema} from '../../editor/editor-schema'
import {safeStringify} from '../../internal-utils/safe-json'
import {
  Node,
  Scrubber,
  Text,
  type Ancestor,
  type Descendant,
  type Element,
  type Path,
} from '../interfaces'

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

function getDeepNode(
  root: Ancestor,
  path: ReadonlyArray<number | string>,
): unknown {
  let current: unknown = root

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      throw new Error(
        `Cannot navigate path ${safeStringify(path)}: hit non-object`,
      )
    }

    if (typeof segment === 'number') {
      const children = Array.isArray(current)
        ? current
        : 'children' in current
          ? (current.children as Array<unknown>)
          : undefined

      if (!children) {
        throw new Error(`Cannot find children at path ${safeStringify(path)}`)
      }

      current = children[segment]
    } else {
      current = (current as Record<string, unknown>)[segment]
    }

    if (current === undefined) {
      throw new Error(`Cannot find node at path ${safeStringify(path)}`)
    }
  }

  return current
}

/**
 * Replace a descendant with a new node, replacing all ancestors
 */
export const modifyDescendant = <N extends Descendant>(
  root: Ancestor,
  path: ReadonlyArray<number | string>,
  _schema: EditorSchema,
  f: (node: N) => N,
) => {
  if (path.length === 0) {
    throw new Error('Cannot modify the editor')
  }

  const node = getDeepNode(root, path) as N
  const slicedPath = path.slice()
  let modifiedNode: unknown = f(node)

  while (slicedPath.length > 1) {
    const segment = slicedPath.pop()!
    const ancestorNode = getDeepNode(root, slicedPath)

    if (typeof segment === 'number') {
      if (Array.isArray(ancestorNode)) {
        modifiedNode = replaceChildren(ancestorNode, segment, 1, modifiedNode)
      } else if (
        typeof ancestorNode === 'object' &&
        ancestorNode !== null &&
        'children' in ancestorNode
      ) {
        modifiedNode = {
          ...ancestorNode,
          children: replaceChildren(
            ancestorNode.children as Array<unknown>,
            segment,
            1,
            modifiedNode,
          ),
        }
      }
    } else if (typeof ancestorNode === 'object' && ancestorNode !== null) {
      modifiedNode = {
        ...ancestorNode,
        [segment]: modifiedNode,
      }
    }
  }

  const firstSegment = slicedPath.pop()!

  if (typeof firstSegment === 'number') {
    root.children = replaceChildren(
      root.children,
      firstSegment,
      1,
      modifiedNode as Descendant,
    )
  } else {
    ;(root as unknown as Record<string, unknown>)[firstSegment] = modifiedNode
  }
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
      if (Text.isText(node, schema) || Node.isObjectNode(node, schema)) {
        throw new Error(
          `Cannot get the element at path [${path}] because it refers to a leaf node: ${Scrubber.stringify(
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
    if (!Text.isText(node, schema)) {
      throw new Error(
        `Cannot get the leaf node at path [${path}] because it refers to a non-leaf node: ${Scrubber.stringify(
          node,
        )}`,
      )
    }

    return f(node)
  })
