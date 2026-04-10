import type {Node} from './node'
import type {Path} from './path'
import type {Range} from './range'

export type InsertNodeOperation = {
  type: 'insert_node'
  path: Path
  node: Node
  position: 'before' | 'after'
}

export type InsertTextOperation = {
  type: 'insert_text'
  path: Path
  offset: number
  text: string
}

export type RemoveNodeOperation = {
  type: 'remove_node'
  path: Path
  node: Node
  previousSiblingKey?: string
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
export type SetOperationData = {
  type: 'set'
  path: Path
  value: unknown
}

/**
 * Data for an `unset` inverse (no nested inverse field).
 */
export type UnsetOperationData = {
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
export type SetOperation = {
  type: 'set'
  path: Path
  value: unknown
  inverse?: SetOperationData | UnsetOperationData
}

/**
 * Remove a property from a node. The path is `[...nodePath, propertyName]`.
 *
 * When `inverse` is provided, the operation can be undone. Remote operations
 * (applied via `withRemoteChanges`) skip the history plugin and do not need
 * inverse data.
 */
export type UnsetOperation = {
  type: 'unset'
  path: Path
  inverse?: SetOperationData
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
  | InsertNodeOperation
  | RemoveNodeOperation
  | SetOperation
  | UnsetOperation
  | SetSelectionOperation
  | InsertTextOperation
  | RemoveTextOperation
