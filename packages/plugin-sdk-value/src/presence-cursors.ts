import type {EditorSelection} from '@portabletext/editor'

/**
 * Reduces a selection to a caret at its focus point.
 *
 * Presence answers where someone is, so decorating their whole selection would
 * highlight text the local user never selected. The Studio collapses the same
 * way, which keeps the two consistent when both are open on a document.
 *
 * @public
 */
export function collapseToCaret(selection: EditorSelection): EditorSelection {
  if (selection === null) {
    return null
  }
  return {anchor: selection.focus, focus: selection.focus}
}
