import type {Node} from './node'
import type {Path} from './path'
import type {Range} from './range'

/**
 * Insert a node before or after the sibling at `path`.
 *
 * @beta
 */
export type InsertOperation = {
  type: 'insert'
  path: Path
  node: Node
  position: 'before' | 'after'
  inverse?: UnsetOperationData
}

/**
 * Insert `text` into the span at `path`, at `offset`.
 *
 * @beta
 */
export type InsertTextOperation = {
  type: 'insert.text'
  path: Path
  offset: number
  text: string
}

/**
 * Remove `text` from the span at `path`, starting at `offset`.
 *
 * @beta
 */
export type RemoveTextOperation = {
  type: 'remove.text'
  path: Path
  offset: number
  text: string
}

/**
 * Data for a `set` inverse (no nested inverse field).
 *
 * @beta
 */
export type SetOperationData = {
  type: 'set'
  path: Path
  value: unknown
}

/**
 * Data for an `insert` inverse (no nested inverse field).
 *
 * @beta
 */
export type InsertOperationData = {
  type: 'insert'
  path: Path
  node: Node
  position: 'before' | 'after'
}

/**
 * Data for an `unset` inverse (no nested inverse field).
 *
 * @beta
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
 *
 * @beta
 */
export type SetOperation = {
  type: 'set'
  path: Path
  value: unknown
  inverse?: SetOperationData | UnsetOperationData
}

/**
 * Remove a property from a node, or remove a node from its parent.
 *
 * Property removal: path is `[...nodePath, propertyName]` (last segment is a string).
 * Node removal: path is `[...parentPath, arrayFieldName, {_key: nodeKey}]`
 * (last segment is a keyed segment pointing to the node to remove).
 *
 * The `inverse` of a node removal carries the removed node; the operation
 * itself only carries its path.
 *
 * @beta
 */
export type UnsetOperation = {
  type: 'unset'
  path: Path
  inverse?: SetOperationData | InsertOperationData
}

type SetSelectionOperation =
  | {
      type: 'set.selection'
      properties: null
      newProperties: Range
    }
  | {
      type: 'set.selection'
      properties: Partial<Range>
      newProperties: Partial<Range>
    }
  | {
      type: 'set.selection'
      properties: Range
      newProperties: null
    }

/**
 * A low-level operation applied by the editor engine. Every change to the
 * editor (local edits, remote patches, value sync, normalization fixes,
 * undo/redo) is expressed as a sequence of these operations.
 *
 * The vocabulary is closed: the dot-named operations (`insert.text`,
 * `remove.text`) are not namespaces that grow members.
 *
 * `inverse` is present when the engine needs the operation to be
 * reversible (local structural operations) and carries what is needed to
 * reverse it. Operations applied from remote patches do not carry it.
 *
 * @beta
 */
export type EngineOperation =
  | InsertOperation
  | SetOperation
  | UnsetOperation
  | SetSelectionOperation
  | InsertTextOperation
  | RemoveTextOperation
