import type {Editor, Range} from 'slate'
import type {EditorSelection} from '..'

// Is the editor currently receiving remote changes that are being applied to the content?
export const IS_PROCESSING_REMOTE_CHANGES: WeakMap<Editor, boolean> =
  new WeakMap()

export const KEY_TO_SLATE_ELEMENT: WeakMap<Editor, any | undefined> =
  new WeakMap()
export const KEY_TO_VALUE_ELEMENT: WeakMap<Editor, any | undefined> =
  new WeakMap()

// Keep object relation to slate range in the portable-text-range
export const SLATE_TO_PORTABLE_TEXT_RANGE = new WeakMap<
  Range,
  EditorSelection
>()
