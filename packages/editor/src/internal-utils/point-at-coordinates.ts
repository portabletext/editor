import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import type {EditorSelectionPoint} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'

/**
 * Resolves viewport (client) coordinates to the editor point where a click
 * at those coordinates would place the caret. Returns `null` when the
 * coordinates don't resolve to a position inside the editor's content.
 */
export function getPointAtCoordinates(
  editorEngine: PortableTextEditorEngine,
  coordinates: {x: number; y: number},
): EditorSelectionPoint | null {
  let domRange: Range | undefined

  try {
    const window = DOMEditor.getWindow(editorEngine)

    if (window.document.caretPositionFromPoint !== undefined) {
      const position = window.document.caretPositionFromPoint(
        coordinates.x,
        coordinates.y,
      )

      if (position) {
        try {
          domRange = window.document.createRange()
          domRange.setStart(position.offsetNode, position.offset)
          domRange.setEnd(position.offsetNode, position.offset)
        } catch {
          // The browser can report a position that `setStart`/`setEnd` reject.
        }
      }
    } else if (window.document.caretRangeFromPoint !== undefined) {
      // WebKit doesn't support `caretPositionFromPoint`.
      domRange =
        window.document.caretRangeFromPoint(coordinates.x, coordinates.y) ??
        undefined
    }
  } catch {
    // `getWindow` throws when the editor isn't mounted.
    return null
  }

  if (!domRange) {
    return null
  }

  try {
    const selection = DOMEditor.toEditorSelection(editorEngine, domRange, {
      exactMatch: false,
      // It can still throw even with this option set to true
      suppressThrow: false,
    })
    return selection?.focus ?? null
  } catch {
    // `toEditorSelection` throws when the DOM position doesn't map into the
    // editor's content.
    return null
  }
}
