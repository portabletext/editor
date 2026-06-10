import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSelectionPoint} from './editor'
import type {Path} from './paths'

/**
 * A low-level operation applied by the editor engine. Every change to the
 * editor — local edits, remote patches, value sync, normalization fixes,
 * undo/redo — is expressed as a sequence of these operations.
 *
 * Subscribe via `editor.on('operation', ...)`.
 *
 * Operation types are dot-grouped by verb (`insert.*`, `set.*`, `unset.*`,
 * `remove.*`), with the suffix naming what the operation acts on. Where the
 * engine's internal `set`/`unset` ops branch on the shape of `path`, the
 * public type carries the discriminator in the type tag.
 *
 * @beta
 */
export type EditorOperation =
  | EditorInsertNodeOperation
  | EditorInsertTextOperation
  | EditorSetValueOperation
  | EditorSetNodeOperation
  | EditorSetPropertyOperation
  | EditorSetSelectionOperation
  | EditorUnsetValueOperation
  | EditorUnsetNodeOperation
  | EditorUnsetPropertyOperation
  | EditorRemoveTextOperation

/**
 * Insert `node` as a sibling of the node at `path`. `position` selects which
 * side the new node lands on.
 *
 * @beta
 */
export type EditorInsertNodeOperation = {
  type: 'insert.node'
  path: Path
  node: PortableTextTextBlock | PortableTextObject | PortableTextSpan
  position: 'before' | 'after'
}

/**
 * Insert `text` into the span at `path`, at `offset`.
 *
 * @beta
 */
export type EditorInsertTextOperation = {
  type: 'insert.text'
  path: Path
  offset: number
  text: string
}

/**
 * Replace the editor's entire value. Emitted when a root-level `set` patch
 * is applied — typically from `editor.send({type: 'update value', ...})` or
 * a remote patch overwriting the document.
 *
 * @beta
 */
export type EditorSetValueOperation = {
  type: 'set.value'
  value: Array<PortableTextBlock>
}

/**
 * Replace the node at `path` with `node`.
 *
 * @beta
 */
export type EditorSetNodeOperation = {
  type: 'set.node'
  path: Path
  node: PortableTextTextBlock | PortableTextObject | PortableTextSpan
}

/**
 * Set the property `propertyName` on the node at `path` to `value`. `path`
 * points to the node, not the property — the property name is its own field.
 *
 * @beta
 */
export type EditorSetPropertyOperation = {
  type: 'set.property'
  path: Path
  propertyName: string
  value: unknown
}

/**
 * @beta
 */
export type EditorSetSelectionOperation =
  | {
      type: 'set.selection'
      properties: null
      newProperties: EditorOperationRange
    }
  | {
      type: 'set.selection'
      properties: Partial<EditorOperationRange>
      newProperties: Partial<EditorOperationRange>
    }
  | {
      type: 'set.selection'
      properties: EditorOperationRange
      newProperties: null
    }

/**
 * Clear the editor's entire value. Emitted when a root-level `unset` patch
 * is applied.
 *
 * @beta
 */
export type EditorUnsetValueOperation = {
  type: 'unset.value'
}

/**
 * Remove the node at `path` from its parent.
 *
 * @beta
 */
export type EditorUnsetNodeOperation = {
  type: 'unset.node'
  path: Path
}

/**
 * Remove the property `propertyName` from the node at `path`. `path` points
 * to the node, not the property.
 *
 * @beta
 */
export type EditorUnsetPropertyOperation = {
  type: 'unset.property'
  path: Path
  propertyName: string
}

/**
 * Remove `text` from the span at `path`, starting at `offset`.
 *
 * @beta
 */
export type EditorRemoveTextOperation = {
  type: 'remove.text'
  path: Path
  offset: number
  text: string
}

/**
 * @beta
 */
type EditorOperationRange = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
}
