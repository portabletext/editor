import {isTextBlock} from '@portabletext/schema'
import {parseBlock} from '../internal-utils/parse-blocks'
import * as selectors from '../selectors'
import * as utils from '../utils'
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
      selectors.isSelectionCollapsed(snapshot) &&
      selectors.getFocusInlineObject(snapshot),
    actions: [],
  }),

  /**
   * You can't split a block object.
   */
  defineBehavior({
    on: 'split',
    guard: ({snapshot}) =>
      selectors.isSelectionCollapsed(snapshot) &&
      selectors.getFocusBlockObject(snapshot),
    actions: [],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || utils.isSelectionCollapsed(selection)) {
        return false
      }

      const selectionStartBlock = selectors.getSelectionStartBlock(snapshot)
      const selectionEndBlock = selectors.getSelectionEndBlock(snapshot)

      if (!selectionStartBlock || !selectionEndBlock) {
        return false
      }

      if (
        !isTextBlock(snapshot.context, selectionStartBlock.node) &&
        isTextBlock(snapshot.context, selectionEndBlock.node)
      ) {
        return {selection}
      }

      return false
    },
    actions: [(_, {selection}) => [raise({type: 'delete', at: selection})]],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || utils.isSelectionCollapsed(selection)) {
        return false
      }

      const selectionStartBlock = selectors.getSelectionStartBlock(snapshot)
      const selectionEndBlock = selectors.getSelectionEndBlock(snapshot)

      if (!selectionStartBlock || !selectionEndBlock) {
        return false
      }

      if (selectionStartBlock.node._key === selectionEndBlock.node._key) {
        return false
      }

      const startPoint = utils.getSelectionStartPoint(selection)
      const startBlockEndPoint = utils.getBlockEndPoint({
        context: snapshot.context,
        block: selectionStartBlock,
      })
      const endPoint = utils.getSelectionEndPoint(selection)
      const endBlockStartPoint = utils.getBlockStartPoint({
        context: snapshot.context,
        block: selectionEndBlock,
      })

      const selectedValue = selectors.getSelectedValue(snapshot)

      const blocksInBetween = selectedValue.filter(
        (block) =>
          block._key !== selectionStartBlock.node._key &&
          block._key !== selectionEndBlock.node._key,
      )

      return {
        startPoint,
        startBlockEndPoint,
        endPoint,
        endBlockStartPoint,
        blocksInBetween,
      }
    },
    actions: [
      (
        _,
        {
          startPoint,
          startBlockEndPoint,
          endPoint,
          endBlockStartPoint,
          blocksInBetween,
        },
      ) => [
        raise({
          type: 'delete',
          at: {anchor: startPoint, focus: startBlockEndPoint},
        }),
        ...blocksInBetween.map((block) =>
          raise({type: 'delete.block', at: [{_key: block._key}]}),
        ),
        raise({
          type: 'delete',
          at: {anchor: endBlockStartPoint, focus: endPoint},
        }),
      ],
    ],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || utils.isSelectionCollapsed(selection)) {
        return false
      }

      return {selection}
    },
    actions: [
      (_, {selection}) => [
        raise({type: 'delete', at: selection}),
        raise({type: 'split'}),
      ],
    ],
  }),

  defineBehavior({
    on: 'split',
    guard: ({snapshot}) => {
      const selection = snapshot.context.selection

      if (!selection || !utils.isSelectionCollapsed(selection)) {
        return false
      }

      const selectionStartPoint = utils.getSelectionStartPoint(selection)

      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const blockEndPoint = utils.getBlockEndPoint({
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
        utils.isSelectionCollapsed(newTextBlockSelection)
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
