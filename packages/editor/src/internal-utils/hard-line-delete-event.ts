import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'

/**
 * The behavior event for a `deleteHardLineBackward` or
 * `deleteHardLineForward` input with a collapsed selection: delete from the
 * caret to the start or end of its text block. At that edge, or outside a
 * text block, it falls back to a character delete so the block merges with
 * its neighbour.
 */
export function getHardLineDeleteEvent(
  editor: PortableTextEditorEngine,
  direction: 'backward' | 'forward',
): BehaviorEvent {
  const characterDeleteEvent: BehaviorEvent =
    direction === 'backward'
      ? {type: 'delete.backward', unit: 'character'}
      : {type: 'delete.forward', unit: 'character'}

  const caret = editor.snapshot.context.selection?.focus
  const focusTextBlock = getFocusTextBlock(editor.snapshot)

  if (!caret || !focusTextBlock) {
    return characterDeleteEvent
  }

  const edge =
    direction === 'backward'
      ? getBlockStartPoint({
          context: editor.snapshot.context,
          block: focusTextBlock,
        })
      : getBlockEndPoint({
          context: editor.snapshot.context,
          block: focusTextBlock,
        })

  if (isEqualSelectionPoints(caret, edge)) {
    return characterDeleteEvent
  }

  return {
    type: 'delete',
    direction,
    at:
      direction === 'backward'
        ? {anchor: edge, focus: caret}
        : {anchor: caret, focus: edge},
  }
}
