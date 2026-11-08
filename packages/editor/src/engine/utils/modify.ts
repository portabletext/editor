import {
  isSpan,
  type PortableTextBlock,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {WalkedNode} from '../../traversal/walk-path'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'

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
 * Replace the node at the last of `nodes` with a new node, replacing all
 * ancestors. `nodes` come from `walkPath`, so the rebuild never walks the
 * path again.
 */
export const modifyDescendant = <N extends Node>(
  editor: Editor,
  nodes: ReadonlyArray<WalkedNode>,
  f: (node: N) => N,
): void => {
  const deepestNode = nodes.at(-1)
  if (!deepestNode) {
    return
  }

  let modifiedNode: Node = f(deepestNode.node as N)

  for (let level = nodes.length - 1; level >= 1; level--) {
    const node = nodes[level]!
    const parentNode = nodes[level - 1]!
    modifiedNode = {
      ...parentNode.node,
      [parentNode.children!.fieldName]: replaceChildren(
        node.siblings,
        node.index,
        1,
        modifiedNode,
      ),
    }
  }

  editor.snapshot.context.value = replaceChildren(
    nodes[0]!.siblings,
    nodes[0]!.index,
    1,
    modifiedNode,
  ) as PortableTextBlock[]
}

/**
 * Replace the structural children of the node at the last of
 * `ownerNodes`, replacing all ancestors. With no nodes, replaces the
 * editor's top-level children.
 */
export const modifyChildren = (
  editor: Editor,
  ownerNodes: ReadonlyArray<WalkedNode>,
  f: (children: Node[]) => Node[],
) => {
  const owner = ownerNodes.at(-1)

  if (!owner) {
    editor.snapshot.context.value = f(
      editor.snapshot.context.value,
    ) as PortableTextBlock[]
    return
  }

  const ownerChildren = owner.children
  if (!ownerChildren) {
    return
  }

  modifyDescendant(editor, ownerNodes, (node) => ({
    ...node,
    [ownerChildren.fieldName]: f(ownerChildren.children),
  }))
}

/**
 * Replace a leaf, replacing all ancestors
 */
export const modifyLeaf = (
  editor: Editor,
  nodes: ReadonlyArray<WalkedNode>,
  f: (leaf: PortableTextSpan) => PortableTextSpan,
) =>
  modifyDescendant(editor, nodes, (node) => {
    if (!isSpan({schema: editor.snapshot.context.schema}, node)) {
      return node
    }

    return f(node)
  })
