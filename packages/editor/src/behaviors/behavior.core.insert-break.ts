import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getNodes} from '../node-traversal/get-nodes'
import {getBlock, isBlock} from '../node-traversal/is-block'
import type {TraversalContainers} from '../schema/resolve-containers'
import {getDefaultStyle} from '../selectors/selector.get-default-style'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {isSelectionExpanded} from '../selectors/selector.is-selection-expanded'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
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
          style: getDefaultStyle(snapshot),
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
          style: getDefaultStyle(snapshot),
        },
        placement: 'before',
        select: 'none',
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

    const selectionStartPoint = getSelectionStartPoint(
      snapshot.context.selection,
    )
    const selectionEndPoint = getSelectionEndPoint(snapshot.context.selection)

    if (!selectionStartPoint || !selectionEndPoint) {
      return false
    }

    const selectionStartBlock = findContainingBlock(
      snapshot.context,
      selectionStartPoint.path,
    )
    const selectionEndBlock = findContainingBlock(
      snapshot.context,
      selectionEndPoint.path,
    )

    if (!selectionStartBlock || !selectionEndBlock) {
      return false
    }

    const startBlockStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block: selectionStartBlock,
    })
    const endBlockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block: selectionEndBlock,
    })

    if (
      isEqualSelectionPoints(selectionStartPoint, startBlockStartPoint) &&
      isEqualSelectionPoints(selectionEndPoint, endBlockEndPoint)
    ) {
      const selectedBlocks: Array<{node: PortableTextBlock; path: Path}> = []
      for (const entry of getNodes(
        {...snapshot.context, blockIndexMap: snapshot.blockIndexMap},
        {
          from: selectionStartBlock.path,
          to: selectionEndBlock.path,
          match: (_node, path) => isBlock(snapshot.context, path),
        },
      )) {
        const block = getBlock(snapshot.context, entry.path)
        if (block) {
          selectedBlocks.push(block)
        }
      }
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
  breakingEntireBlocks,
  breakingInlineObject,
}

/**
 * Find the block that contains a given point path. If the path itself points
 * at a block (e.g. a void block object), returns it. Otherwise walks
 * ancestors until it finds one.
 */
function findContainingBlock(
  context: {
    schema: EditorSchema
    containers: TraversalContainers
    value: Array<Node>
  },
  path: Path,
): {node: PortableTextBlock; path: Path} | undefined {
  const direct = getBlock(context, path)
  if (direct) {
    return direct
  }
  for (const ancestor of getAncestors(context, path)) {
    if (isBlock(context, ancestor.path)) {
      const block = getBlock(context, ancestor.path)
      if (block) {
        return block
      }
    }
  }
  return undefined
}
