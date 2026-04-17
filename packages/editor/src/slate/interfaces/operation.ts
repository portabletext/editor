import type {Node} from './node'
import type {Path} from './path'
import type {Range} from './range'

export type InsertOperation = {
  type: 'insert'
  path: Path
  node: Node
  position: 'before' | 'after'
  inverse?: UnsetOperationData
}

export type InsertTextOperation = {
  type: 'insert_text'
  path: Path
  offset: number
  text: string
}

export type RemoveTextOperation = {
  type: 'remove_text'
  path: Path
  offset: number
  text: string
}

/**
 * Data for a `set` inverse (no nested inverse field).
 */
type SetOperationData = {
  type: 'set'
  path: Path
  value: unknown
}

/**
 * Data for an `insert` inverse (no nested inverse field).
 */
type InsertOperationData = {
  type: 'insert'
  path: Path
  node: Node
  position: 'before' | 'after'
}

/**
 * Data for an `unset` inverse (no nested inverse field).
 */
type UnsetOperationData = {
  type: 'unset'
  path: Path
}

/**
 * Set a property on a node. The path is `[...nodePath, propertyName]`.
 *
 * When `inverse` is provided, the operation can be undone. Remote operations
 * (applied via `withRemoteChanges`) skip the history plugin and do not need
 * inverse data.
 */
type SetOperation = {
  type: 'set'
  path: Path
  value: unknown
  inverse?: SetOperationData | UnsetOperationData
}

/**
 * Remove a property from a node, or remove a node from its parent.
 *
 * Property removal: path is `[...nodePath, propertyName]` (last segment is a string).
 * Node removal: path is `[...parentPath, childFieldName, {_key: nodeKey}]`
 * (last segment is a keyed segment pointing to the node to remove).
 */
type UnsetOperation = {
  type: 'unset'
  path: Path
  inverse?: SetOperationData | InsertOperationData
}

type SetSelectionOperation =
  | {
      type: 'set_selection'
      properties: null
      newProperties: Range
    }
  | {
      type: 'set_selection'
      properties: Partial<Range>
      newProperties: Partial<Range>
    }
  | {
      type: 'set_selection'
      properties: Range
      newProperties: null
    }

export type Operation =
  | InsertOperation
  | SetOperation
  | UnsetOperation
  | SetSelectionOperation
  | InsertTextOperation
  | RemoveTextOperation
