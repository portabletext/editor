import {
  isPortableTextSpan,
  isPortableTextTextBlock,
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import {produce} from 'immer'
import {Editor, Element, ElementEntry, Path, Range, Scrubber, Text} from 'slate'

/**
 * The `Node` union type represents all of the different types of nodes that
 * occur in a Slate document tree.
 */

export type BaseNode = Editor | Element | Text
export type Node = Editor | Element | Text
export type PTNode =
  | {children: Array<PortableTextBlock>}
  | PortableTextTextBlock
  | PortableTextObject
  | PortableTextSpan

export interface NodeAncestorsOptions {
  reverse?: boolean
}

export interface NodeChildrenOptions {
  reverse?: boolean
}

export interface NodeDescendantsOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (node: NodeEntry) => boolean
}

export interface NodeElementsOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (node: NodeEntry) => boolean
}

export interface NodeLevelsOptions {
  reverse?: boolean
}

export interface NodeNodesOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (entry: NodeEntry) => boolean
}

export interface NodeTextsOptions {
  from?: Path
  to?: Path
  reverse?: boolean
  pass?: (node: NodeEntry) => boolean
}

export interface NodeInterface {
  /**
   * Get the descendant node referred to by a specific path. If the path is an
   * empty array, it refers to the root node itself.
   */
  get: (root: PTNode, path: Path) => PTNode

  /**
   * Similar to get, but returns undefined if the node does not exist.
   */
  getIf: (root: PTNode, path: Path) => PTNode | undefined

  /**
   * Get the node at a specific path, ensuring it's a leaf text node.
   */
  leaf: (root: PTNode, path: Path) => PTNode

  /**
   * Get the parent of a node at a specific path.
   */
  parent: (root: PTNode, path: Path) => PortableTextTextBlock
}

export const PTNode: NodeInterface = {
  get(root: PTNode, path: Path): PTNode {
    const node = PTNode.getIf(root, path)
    if (node === undefined) {
      throw new Error(
        `Cannot find a descendant at path [${path}] in node: ${Scrubber.stringify(
          root,
        )}`,
      )
    }
    return node
  },

  getIf(root: PTNode, path: Path): PTNode | undefined {
    let node = root

    for (let i = 0; i < path.length; i++) {
      const p = path[i]

      // if (!isPortableTextTextBlock(node)) {
      //   return
      // }
      // debugger
      if ('children' in node && Array.isArray(node.children)) {
        node = node.children[p]
      }
    }

    return node
  },

  leaf(root: PTNode, path: Path): PTNode {
    const node = PTNode.get(root, path)

    return node
  },

  parent(root: PTNode, path: Path): PortableTextTextBlock {
    const parentPath = Path.parent(path)
    const p = PTNode.get(root, parentPath)

    if (!Array.isArray(p.children)) {
      throw new Error('boo')
    }

    // if (Text.isText(p)) {
    //   throw new Error(
    //     `Cannot get the parent of path [${path}] because it does not exist in the root.`,
    //   )
    // }

    return p
  },
}

/**
 * The `Descendant` union type represents nodes that are descendants in the
 * tree. It is returned as a convenience in certain cases to narrow a value
 * further than the more generic `Node` union.
 */

export type Descendant = Element | Text

/**
 * The `Ancestor` union type represents nodes that are ancestors in the tree.
 * It is returned as a convenience in certain cases to narrow a value further
 * than the more generic `Node` union.
 */

export type Ancestor = Editor | Element

/**
 * `NodeEntry` objects are returned when iterating over the nodes in a Slate
 * document tree. They consist of the node and its `Path` relative to the root
 * node in the document.
 */

export type NodeEntry<T extends Node = Node> = [T, Path]

/**
 * Convenience type for returning the props of a node.
 */
export type NodeProps =
  | Omit<Editor, 'children'>
  | Omit<Element, 'children'>
  | Omit<Text, 'text'>
