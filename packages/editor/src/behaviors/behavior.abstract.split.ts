import {isTextBlock} from '@portabletext/schema'
import {isSelectionExpanded} from '../selectors'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getSelectionEndBlock} from '../selectors/selector.get-selection-end-block'
import {getSelectionStartBlock} from '../selectors/selector.get-selection-start-block'
import {isEqualSelectionPoints} from '../utils'
import {parseBlock} from '../utils/parse-blocks'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'
import {sliceTextBlock} from '../utils/util.slice-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSplitBehaviors = [
  /**
   * You can't split an inline object.
   */
  defineBehavior({
    on: 'split',
    guard: ({snapshot}) =>
      isSelectionCollapsed(snapshot.context.selection) &&
      getFocusInlineObject(snapshot),
    actions: [],
  }),

  /**
   * You can't split a block object.
   */
  defineBehavior({
    on: 'split',
    guard: ({snapshot}) =>
      isSelectionCollapsed(snapshot.context.selection) &&
      getFocusBlockObject(snapshot),
    actions: [],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || isSelectionCollapsed(selection)) {
        return false
      }

      const startPoint = getSelectionStartPoint(selection)
      const endPoint = getSelectionEndPoint(selection)

      if (!startPoint || !endPoint) {
        return false
      }

      const startBlock = getSelectionStartBlock(snapshot)
      const endBlock = getSelectionEndBlock(snapshot)

      if (!startBlock || !endBlock) {
        return false
      }

      const startBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: startBlock,
      })
      const endBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: endBlock,
      })

      if (
        isTextBlock(snapshot.context, startBlock.node) &&
        isTextBlock(snapshot.context, endBlock.node) &&
        !isEqualSelectionPoints(startPoint, startBlockStartPoint) &&
        !isEqualSelectionPoints(endPoint, endBlockEndPoint)
      ) {
        return true
      }

      return false
    },
    actions: [() => [raise({type: 'delete'}), raise({type: 'split'})]],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      return isSelectionExpanded(snapshot)
    },
    actions: [() => [raise({type: 'delete'})]],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || !isSelectionCollapsed(selection)) {
        return false
      }

      const selectionStartPoint = getSelectionStartPoint(selection)

      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const blockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })

      const newTextBlockSelection = {
        anchor: selectionStartPoint,
        focus: blockEndPoint,
      }

      const newTextBlock = parseBlock({
        block: sliceTextBlock({
          context: {
            ...snapshot.context,
            selection: newTextBlockSelection,
          },
          block: focusTextBlock.node,
        }),
        context: snapshot.context,
        options: {
          removeUnusedMarkDefs: true,
          validateFields: false,
        },
      })

      if (!newTextBlock) {
        return false
      }

      return {
        newTextBlock,
        newTextBlockSelection,
      }
    },
    actions: [
      (_, {newTextBlock, newTextBlockSelection}) =>
        isSelectionCollapsed(newTextBlockSelection)
          ? [
              raise({
                type: 'insert.block',
                block: newTextBlock,
                placement: 'after',
                select: 'start',
              }),
            ]
          : [
              raise({type: 'delete', at: newTextBlockSelection}),
              raise({
                type: 'insert.block',
                block: newTextBlock,
                placement: 'after',
                select: 'start',
              }),
            ],
    ],
  }),
]
