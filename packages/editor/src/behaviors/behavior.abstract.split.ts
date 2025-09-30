import {isTextBlock} from '@portabletext/schema'
import {getFocusBlockObject} from '../selectors/selector.get-focus-block-object'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getSelectedValue} from '../selectors/selector.get-selected-value'
import {getSelectionEndBlock} from '../selectors/selector.get-selection-end-block'
import {getSelectionStartBlock} from '../selectors/selector.get-selection-start-block'
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

      const selectionStartBlock = getSelectionStartBlock(snapshot)
      const selectionEndBlock = getSelectionEndBlock(snapshot)

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

      if (!selection || isSelectionCollapsed(selection)) {
        return false
      }

      const selectionStartBlock = getSelectionStartBlock(snapshot)
      const selectionEndBlock = getSelectionEndBlock(snapshot)

      if (!selectionStartBlock || !selectionEndBlock) {
        return false
      }

      if (selectionStartBlock.node._key === selectionEndBlock.node._key) {
        return false
      }

      const startPoint = getSelectionStartPoint(selection)
      const startBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: selectionStartBlock,
      })
      const endPoint = getSelectionEndPoint(selection)
      const endBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: selectionEndBlock,
      })

      const selectedValue = getSelectedValue(snapshot)

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

      if (!selection || isSelectionCollapsed(selection)) {
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
