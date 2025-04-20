import {isTextBlock, parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import {getSelectionStartPoint, isEqualSelectionPoints} from '../utils'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {sliceBlocks} from '../utils/util.slice-blocks'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSplitBehaviors = [
  defineBehavior({
    on: 'split.block',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      if (!selectors.isSelectionExpanded(snapshot)) {
        return false
      }

      const firstBlock = selectors.getFirstBlock(snapshot)
      const lastBlock = selectors.getLastBlock(snapshot)

      if (!firstBlock || !lastBlock) {
        return false
      }

      const firstBlockStartPoint = getBlockStartPoint(firstBlock)
      const selectionStartPoint = getSelectionStartPoint(
        snapshot.context.selection,
      )
      const lastBlockEndPoint = getBlockEndPoint(lastBlock)
      const selectionEndPoint = getSelectionEndPoint(snapshot.context.selection)

      if (
        isEqualSelectionPoints(firstBlockStartPoint, selectionStartPoint) &&
        isEqualSelectionPoints(lastBlockEndPoint, selectionEndPoint)
      ) {
        return {selection: snapshot.context.selection}
      }

      return false
    },
    actions: [
      (_, {selection}) => [
        raise({
          type: 'delete',
          at: selection,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'split.block',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      const selectionStartPoint = getSelectionStartPoint(
        snapshot.context.selection,
      )
      const selectionEndPoint = getSelectionEndPoint(snapshot.context.selection)

      const focusTextBlock = selectors.getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: selectionStartPoint,
            focus: selectionEndPoint,
          },
        },
      })

      if (focusTextBlock) {
        const blockEndPoint = getBlockEndPoint(focusTextBlock)
        const newTextBlockSelection = {
          anchor: selectionEndPoint,
          focus: blockEndPoint,
        }
        const newTextBlock = parseBlock({
          block: sliceBlocks({
            blocks: [focusTextBlock.node],
            selection: newTextBlockSelection,
          }).at(0),
          context: snapshot.context,
          options: {refreshKeys: true},
        })

        if (
          !newTextBlock ||
          !isTextBlock(snapshot.context.schema, newTextBlock)
        ) {
          return false
        }

        return {
          newTextBlock,
          newTextBlockSelection,
          selection: {
            anchor: selectionStartPoint,
            focus: blockEndPoint,
          },
        }
      }

      const focusBlockObject = selectors.getFocusBlockObject({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: selectionStartPoint,
            focus: selectionEndPoint,
          },
        },
      })

      if (focusBlockObject) {
        const newTextBlock = parseBlock({
          block: {
            _type: snapshot.context.schema.block.name,
            children: [],
          },
          context: snapshot.context,
          options: {refreshKeys: true},
        })

        if (!newTextBlock) {
          return false
        }

        return {
          newTextBlock,
          newTextBlockSelection: {
            anchor: selectionEndPoint,
            focus: selectionEndPoint,
          },
          selection: snapshot.context.selection,
        }
      }

      return false
    },
    actions: [
      (_, {newTextBlock, selection}) => [
        raise({
          type: 'delete',
          at: selection,
        }),
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
