import {getHighestObjectNode} from '../node-traversal/get-highest-object-node'
import {after} from '../slate/editor/after'
import {before} from '../slate/editor/before'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import type {TextUnit} from '../slate/types/types'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applyDelete, type SelectionMode} from './delete-internal'

interface DeleteCollapsedOptions {
  /**
   * Granularity of the expansion:
   * - `'character'` for Backspace and Delete.
   * - `'word'` for Alt+Backspace and Alt+Delete.
   * - `'line'` and `'block'` for the larger movement keybindings.
   */
  unit: TextUnit
  /**
   * `'forward'` for Delete (expands toward the end of the document),
   * `'backward'` for Backspace.
   */
  direction: 'forward' | 'backward'
  /**
   * What to do with the editor selection after the delete:
   * - `'collapse-to-start'` collapses to the start of the deleted range.
   * - `'preserve'` leaves selection alone, for callers that update it
   *   themselves.
   */
  selection: SelectionMode
}

/**
 * Delete from a collapsed cursor. The cursor is expanded into a range using
 * `unit` and `direction` and then deleted as if the user had selected it
 * explicitly. If the cursor is inside a void node (e.g. an image block or an
 * inline object) the whole node is removed instead.
 *
 * Backward character delete on Indic scripts deletes one code point per
 * keystroke rather than the full grapheme cluster.
 */
export function deleteCollapsed(
  editor: PortableTextSlateEditor,
  point: Point,
  options: DeleteCollapsedOptions,
): void {
  withoutNormalizing(editor, () => {
    const furthestObjectNode = getHighestObjectNode(editor, point.path)
    if (furthestObjectNode) {
      editor.apply({type: 'unset', path: furthestObjectNode.path})
      return
    }

    const target =
      options.direction === 'backward'
        ? before(editor, point, {unit: options.unit}) || editorStart(editor, [])
        : after(editor, point, {unit: options.unit}) || editorEnd(editor, [])

    const range: Range = {anchor: point, focus: target}
    if (isCollapsedRange(range)) {
      return
    }

    const reverse = options.direction === 'backward'
    applyDelete(editor, range, {
      capture: reverse && options.unit === 'character',
      collapsedInput: true,
      reverse,
      unit: options.unit,
      selection: options.selection,
      removeEmptyStartBlock: true,
    })
  })
}
