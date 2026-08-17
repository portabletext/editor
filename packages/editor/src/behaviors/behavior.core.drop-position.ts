import type {Path} from '../engine/interfaces/path'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import type {EventPositionBlock} from '../internal-utils/event-position'
import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import {getDragSelection} from '../selectors/drag-selection'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getSelectedBlocks} from '../selectors/selector.get-selected-blocks'
import {isSelectingEntireBlocks} from '../selectors/selector.is-selecting-entire-blocks'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {forward} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export type DropPosition = {
  path: Path
  position: EventPositionBlock
}

export function createDropPositionBehaviorsConfig({
  setDropPosition,
}: {
  setDropPosition: (next: DropPosition | undefined) => void
}) {
  return [
    {
      behavior: defineBehavior({
        on: 'drag.dragover',
        guard: ({snapshot, event}) => {
          const dropFocusBlock = getFocusBlock({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: event.position.selection,
            },
          })

          if (!dropFocusBlock) {
            return false
          }

          const dragOrigin = event.dragOrigin

          if (!dragOrigin) {
            return false
          }

          const dragSelection = getDragSelection({
            eventSelection: dragOrigin.selection,
            snapshot,
          })

          const draggedBlocks = getSelectedBlocks({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragSelection,
            },
          })

          if (
            draggedBlocks.some(
              (draggedBlock) =>
                draggedBlock.node._key === dropFocusBlock.node._key,
            )
          ) {
            return false
          }

          const draggingEntireBlocks = isSelectingEntireBlocks({
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: dragSelection,
            },
          })

          if (!draggingEntireBlocks) {
            return false
          }

          // A collapsed drop strictly inside a non-empty text block's own
          // characters splits the block on drop instead of snapping, and the
          // browser's native drop caret is the affordance there: hide the
          // boundary indicator so it doesn't promise a before/after placement
          // the drop won't make. Mirror of the placement predicate in
          // `behavior.core.dnd.ts`.
          const dropSnapshot = {
            ...snapshot,
            context: {
              ...snapshot.context,
              selection: event.position.selection,
            },
          }
          const focusTextBlock = getFocusTextBlock(dropSnapshot)
          const droppedInsideTextBlock =
            isCollapsedRange(event.position.selection) &&
            focusTextBlock !== undefined &&
            !isEmptyTextBlock(snapshot.context, focusTextBlock.node) &&
            getFocusInlineObject(dropSnapshot) === undefined &&
            !isEqualSelectionPoints(
              event.position.selection.focus,
              getBlockStartPoint({
                context: snapshot.context,
                block: focusTextBlock,
              }),
            ) &&
            !isEqualSelectionPoints(
              event.position.selection.focus,
              getBlockEndPoint({
                context: snapshot.context,
                block: focusTextBlock,
              }),
            )

          if (droppedInsideTextBlock) {
            // Clear rather than skip: a boundary hover may have painted an
            // indicator that must not linger while the pointer sits mid-block
            // (the clearing behavior below never fires on `drag.dragover`).
            return {dropFocusBlock: undefined}
          }

          return {dropFocusBlock}
        },
        actions: [
          ({event}, {dropFocusBlock}) => [
            {
              type: 'effect',
              effect: () => {
                setDropPosition(
                  dropFocusBlock
                    ? {
                        path: dropFocusBlock.path,
                        position: event.position.block,
                      }
                    : undefined,
                )
              },
            },
          ],
        ],
      }),
      priority: createEditorPriority({
        reference: {
          priority: corePriority,
          importance: 'lower',
        },
      }),
    },
    {
      behavior: defineBehavior({
        on: 'drag.*',
        guard: ({event}) => {
          return event.type !== 'drag.dragover'
        },
        actions: [
          ({event}) => [
            {
              type: 'effect',
              effect: () => {
                setDropPosition(undefined)
              },
            },
            forward(event),
          ],
        ],
      }),
      priority: createEditorPriority({
        reference: {
          priority: corePriority,
          importance: 'lower',
        },
      }),
    },
  ]
}
