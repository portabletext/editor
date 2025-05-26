import {isTextBlock, parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import {getSelectionStartPoint, isSelectionCollapsed} from '../utils'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {sliceBlocks} from '../utils/util.slice-blocks'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSplitBehaviors = [
  defineBehavior({
    on: 'split',
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
        const blockEndPoint = getBlockEndPoint({
          context: snapshot.context,
          block: focusTextBlock,
        })
        const newTextBlockSelection = {
          anchor: selectionEndPoint,
          focus: blockEndPoint,
        }
        const newTextBlock = parseBlock({
          block: sliceBlocks({
            context: {
              ...snapshot.context,
              selection: newTextBlockSelection,
            },
            blocks: [focusTextBlock.node],
          }).at(0),
          context: snapshot.context,
          options: {refreshKeys: true, validateFields: true},
        })

        if (!newTextBlock || !isTextBlock(snapshot.context, newTextBlock)) {
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
          options: {refreshKeys: true, validateFields: true},
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
      (_, {newTextBlock, selection}) =>
        isSelectionCollapsed(selection)
          ? [
              raise({
                type: 'insert.block',
                block: newTextBlock,
                placement: 'after',
                select: 'start',
              }),
            ]
          : [
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
