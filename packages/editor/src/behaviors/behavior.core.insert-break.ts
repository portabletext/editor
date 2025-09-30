import {getFirstBlock} from '../selectors/selector.get-first-block'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {getSelectedBlocks} from '../selectors/selector.get-selected-blocks'
import {getSelectionEndBlock} from '../selectors/selector.get-selection-end-block'
import {getSelectionStartBlock} from '../selectors/selector.get-selection-start-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const breakingAtTheEndOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const atTheEndOfBlock = isAtTheEndOfBlock(focusTextBlock)(snapshot)

    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    if (atTheEndOfBlock) {
      return {focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    ({snapshot}, {focusListItem, focusLevel}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
          children: [
            {
              _type: snapshot.context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          listItem: focusListItem,
          level: focusLevel,
          style: snapshot.context.schema.styles[0]?.name,
        },
        placement: 'after',
      }),
    ],
  ],
})

const breakingAtTheStartOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)
    const selectionCollapsed = isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const focusSpan = getFocusSpan(snapshot)

    const focusDecorators = focusSpan?.node.marks?.filter(
      (mark) =>
        snapshot.context.schema.decorators.some(
          (decorator) => decorator.name === mark,
        ) ?? [],
    )
    const focusAnnotations =
      focusSpan?.node.marks?.filter(
        (mark) =>
          !snapshot.context.schema.decorators.some(
            (decorator) => decorator.name === mark,
          ),
      ) ?? []
    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    const atTheStartOfBlock = isAtTheStartOfBlock(focusTextBlock)(snapshot)

    if (atTheStartOfBlock) {
      return {focusAnnotations, focusDecorators, focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    (
      {snapshot},
      {focusAnnotations, focusDecorators, focusListItem, focusLevel},
    ) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
          children: [
            {
              _type: snapshot.context.schema.span.name,
              marks: focusAnnotations.length === 0 ? focusDecorators : [],
              text: '',
            },
          ],
          listItem: focusListItem,
          level: focusLevel,
          style: snapshot.context.schema.styles[0]?.name,
        },
        placement: 'before',
        select: 'none',
      }),
    ],
  ],
})

const breakingEntireDocument = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    if (!snapshot.context.selection) {
      return false
    }

    if (!isSelectionExpanded(snapshot)) {
      return false
    }

    const firstBlock = getFirstBlock(snapshot)
    const lastBlock = getLastBlock(snapshot)

    if (!firstBlock || !lastBlock) {
      return false
    }

    const firstBlockStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block: firstBlock,
    })
    const selectionStartPoint = getSelectionStartPoint(
      snapshot.context.selection,
    )
    const lastBlockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: lastBlock,
    })
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
})

const breakingEntireBlocks = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    if (!snapshot.context.selection) {
      return false
    }

    if (!isSelectionExpanded(snapshot)) {
      return false
    }

    const selectedBlocks = getSelectedBlocks(snapshot)
    const selectionStartBlock = getSelectionStartBlock(snapshot)
    const selectionEndBlock = getSelectionEndBlock(snapshot)

    if (!selectionStartBlock || !selectionEndBlock) {
      return false
    }

    const startBlockStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock,
    })
    const selectionStartPoint = getSelectionStartPoint(
      snapshot.context.selection,
    )
    const endBlockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock,
    })
    const selectionEndPoint = getSelectionEndPoint(snapshot.context.selection)

    if (
      isEqualSelectionPoints(selectionStartPoint, startBlockStartPoint) &&
      isEqualSelectionPoints(selectionEndPoint, endBlockEndPoint)
    ) {
      return {selectedBlocks}
    }

    return false
  },
  actions: [
    ({snapshot}, {selectedBlocks}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
          children: [
            {
              _type: snapshot.context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
        },
        placement: 'before',
        select: 'start',
      }),
      ...selectedBlocks.map((block) =>
        raise({
          type: 'delete.block',
          at: block.path,
        }),
      ),
    ],
  ],
})

const breakingInlineObject = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const selectionCollapsed = isSelectionCollapsed(snapshot)
    const focusInlineObject = getFocusInlineObject(snapshot)

    return selectionCollapsed && focusInlineObject
  },
  actions: [
    () => [raise({type: 'move.forward', distance: 1}), raise({type: 'split'})],
  ],
})

export const coreInsertBreakBehaviors = {
  breakingAtTheEndOfTextBlock,
  breakingAtTheStartOfTextBlock,
  breakingEntireDocument,
  breakingEntireBlocks,
  breakingInlineObject,
}
