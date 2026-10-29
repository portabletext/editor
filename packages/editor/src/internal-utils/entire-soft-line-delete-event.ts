import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {range as editorRange} from '../engine/editor/range'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {findEntireLineRange} from './find-current-line-range'

/**
 * The behavior events for a `deleteEntireSoftLine` input with a collapsed
 * selection: delete the whole visual line around the caret.
 */
export function getEntireSoftLineDeleteEvents(
  editor: PortableTextEditorEngine,
): Array<BehaviorEvent> {
  const lineDeleteEvents: Array<BehaviorEvent> = [
    {type: 'delete.backward', unit: 'line'},
    {type: 'delete.forward', unit: 'line'},
  ]

  const caret = editor.snapshot.context.selection?.focus
  const focusTextBlock = getFocusTextBlock(editor.snapshot)

  if (!caret || !focusTextBlock) {
    return lineDeleteEvents
  }

  // Measured on the current layout in one pass. Deleting one half first
  // reflows the text, so the other half would be measured on the wrong line.
  const lineRange = findEntireLineRange(
    editor,
    editorRange(editor, focusTextBlock.path),
    caret,
  )

  if (isCollapsedRange(lineRange)) {
    return lineDeleteEvents
  }

  return [{type: 'delete', at: lineRange}]
}
