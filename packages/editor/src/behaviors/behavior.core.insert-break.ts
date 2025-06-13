import * as selectors from '../selectors'
import * as utils from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const breakingAtTheEndOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const atTheEndOfBlock =
      selectors.isAtTheEndOfBlock(focusTextBlock)(snapshot)

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
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const focusSpan = selectors.getFocusSpan(snapshot)

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

    const atTheStartOfBlock =
      selectors.isAtTheStartOfBlock(focusTextBlock)(snapshot)

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

    if (!selectors.isSelectionExpanded(snapshot)) {
      return false
    }

    const firstBlock = selectors.getFirstBlock(snapshot)
    const lastBlock = selectors.getLastBlock(snapshot)

    if (!firstBlock || !lastBlock) {
      return false
    }

    const firstBlockStartPoint = utils.getBlockStartPoint({
      context: snapshot.context,
      block: firstBlock,
    })
    const selectionStartPoint = utils.getSelectionStartPoint(
      snapshot.context.selection,
    )
    const lastBlockEndPoint = utils.getBlockEndPoint({
      context: snapshot.context,
      block: lastBlock,
    })
    const selectionEndPoint = utils.getSelectionEndPoint(
      snapshot.context.selection,
    )

    if (
      utils.isEqualSelectionPoints(firstBlockStartPoint, selectionStartPoint) &&
      utils.isEqualSelectionPoints(lastBlockEndPoint, selectionEndPoint)
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

    if (!selectors.isSelectionExpanded(snapshot)) {
      return false
    }

    const selectedBlocks = selectors.getSelectedBlocks(snapshot)
    const selectionStartBlock = selectors.getSelectionStartBlock(snapshot)
    const selectionEndBlock = selectors.getSelectionEndBlock(snapshot)

    if (!selectionStartBlock || !selectionEndBlock) {
      return false
    }

    const startBlockStartPoint = utils.getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock,
    })
    const selectionStartPoint = utils.getSelectionStartPoint(
      snapshot.context.selection,
    )
    const endBlockEndPoint = utils.getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock,
    })
    const selectionEndPoint = utils.getSelectionEndPoint(
      snapshot.context.selection,
    )

    if (
      utils.isEqualSelectionPoints(selectionStartPoint, startBlockStartPoint) &&
      utils.isEqualSelectionPoints(selectionEndPoint, endBlockEndPoint)
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
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)
    const focusInlineObject = selectors.getFocusInlineObject(snapshot)

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
