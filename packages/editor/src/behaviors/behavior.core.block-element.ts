import type {EventPositionBlock} from '../internal-utils/event-position'
import {corePriority} from '../priority/priority.core'
import {createEditorPriority} from '../priority/priority.types'
import {getDragSelection} from '../selectors/drag-selection'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getSelectedBlocks} from '../selectors/selector.get-selected-blocks'
import {isSelectingEntireBlocks} from '../selectors/selector.is-selecting-entire-blocks'
import {forward} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export function createCoreBlockElementBehaviorsConfig({
  key,
  onSetDragPositionBlock,
}: {
  key: string
  onSetDragPositionBlock: (
    eventPositionBlock: EventPositionBlock | undefined,
  ) => void
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

          if (!dropFocusBlock || dropFocusBlock.node._key !== key) {
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
            draggedBlocks.some((draggedBlock) => draggedBlock.node._key === key)
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

          return draggingEntireBlocks
        },
        actions: [
          ({event}) => [
            {
              type: 'effect',
              effect: () => {
                onSetDragPositionBlock(event.position.block)
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
                onSetDragPositionBlock(undefined)
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
