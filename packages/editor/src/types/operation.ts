import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSelectionPoint} from './editor'
import type {Path} from './paths'

/**
 * A low-level operation applied by the editor engine. Every change to the
 * editor — local edits, remote patches, value sync, normalization fixes,
 * undo/redo — is expressed as a sequence of these six operations.
 *
 * Subscribe via `editor.on('operation', ...)`.
 *
 * @beta
 */
export type EditorOperation =
  | {
      /**
       * Insert a node before or after the sibling at `path`.
       */
      type: 'insert'
      path: Path
      node: PortableTextTextBlock | PortableTextObject | PortableTextSpan
      position: 'before' | 'after'
    }
  | {
      /**
       * Insert `text` into the span at `path`, at `offset`.
       */
      type: 'insert.text'
      path: Path
      offset: number
      text: string
    }
  | {
      /**
       * Remove `text` from the span at `path`, starting at `offset`.
       */
      type: 'remove.text'
      path: Path
      offset: number
      text: string
    }
  | {
      /**
       * Set a property on a node. The path is `[...nodePath, propertyName]`.
       */
      type: 'set'
      path: Path
      value: unknown
    }
  | {
      /**
       * Remove a property from a node, or remove a node from its parent.
       *
       * Property removal: path is `[...nodePath, propertyName]` (last segment
       * is a string). Node removal: the last segment is a keyed segment
       * pointing at the node to remove.
       */
      type: 'unset'
      path: Path
    }
  | EditorSetSelectionOperation

/**
 * @beta
 */
type EditorSetSelectionOperation =
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
 * @beta
 */
type EditorOperationRange = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
}
