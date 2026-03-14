import type {Editor} from '../interfaces/editor'
import type {ExtendedType} from '../types/custom-types'
import type {Element} from './element'
import type {Path} from './path'
import type {Text} from './text'

/**
 * `ObjectNode` represents a node with semantic content but no children or text.
 * Block objects and inline objects are ObjectNodes in the tree.
 */

export interface BaseObjectNode {
  _type: string
  _key: string
  [key: string]: unknown
}

export type ObjectNode = ExtendedType<'ObjectNode', BaseObjectNode>

/**
 * The `Node` union type represents all of the different types of nodes that
 * occur in a Slate document tree.
 */

export type Node = Editor | Element | ObjectNode | Text

export interface NodeChildrenOptions {
  reverse?: boolean
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

/**
 * The `Descendant` union type represents nodes that are descendants in the
 * tree. It is returned as a convenience in certain cases to narrow a value
 * further than the more generic `Node` union.
 */

export type Descendant = Element | ObjectNode | Text

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
  | ObjectNode
  | Omit<Text, 'text'>
