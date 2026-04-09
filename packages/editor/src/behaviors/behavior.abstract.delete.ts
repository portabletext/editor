import {isSpan} from '@portabletext/schema'
import {getNode} from '../node-traversal/get-node'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {getTextBlock} from '../traversal'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeleteBehaviors = [
  defineBehavior({
    on: 'delete.backward',
    guard: ({snapshot}) => {
      return snapshot.context.selection
    },
    actions: [
      ({event}) => [
        raise({
          type: 'delete',
          direction: 'backward',
          unit: event.unit,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete',
    guard: ({snapshot, event}) => {
      if (event.direction !== 'backward') {
        return false
      }

      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      const previousBlock = getPreviousBlock(adjustedSnapshot)
      const focusTextBlock = getTextBlock(adjustedSnapshot)

      if (!previousBlock || !focusTextBlock) {
        return false
      }

      if (!isSelectionCollapsed(at)) {
        return false
      }

      const blockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      if (!isEqualSelectionPoints(at.focus, blockStartPoint)) {
        return false
      }

      const previousBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: previousBlock,
      })

      if (!isTextBlockNode(snapshot.context, previousBlock.node)) {
        return false
      }

      return {previousBlockEndPoint, focusTextBlock}
    },
    actions: [
      (_, {previousBlockEndPoint, focusTextBlock}) => [
        raise({
          type: 'delete.block',
          at: focusTextBlock.path,
        }),
        raise({
          type: 'select',
          at: {
            anchor: previousBlockEndPoint,
            focus: previousBlockEndPoint,
          },
        }),
        raise({
          type: 'insert.block',
          block: focusTextBlock.node,
          placement: 'auto',
          select: 'start',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.forward',
    guard: ({snapshot}) => {
      return snapshot.context.selection
    },
    actions: [
      ({event}) => [
        raise({
          type: 'delete',
          direction: 'forward',
          unit: event.unit,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete',
    guard: ({snapshot, event}) => {
      if (event.direction !== 'forward') {
        return false
      }

      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      const nextBlock = getNextBlock(adjustedSnapshot)
      const focusTextBlock = getTextBlock(adjustedSnapshot)

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
        return false
      }

      const nextBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: nextBlock,
      })

      return {focusTextBlock, nextBlockStartPoint}
    },
    actions: [
      (_, {focusTextBlock, nextBlockStartPoint}) => [
        raise({
          type: 'delete.block',
          at: focusTextBlock.path,
        }),
        raise({
          type: 'select',
          at: {
            anchor: nextBlockStartPoint,
            focus: nextBlockStartPoint,
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete',
    guard: ({snapshot, event}) => {
      if (event.direction !== 'forward') {
        return false
      }

      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      const nextBlock = getNextBlock(adjustedSnapshot)
      const focusTextBlock = getTextBlock(adjustedSnapshot)

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!isSelectionCollapsed(at)) {
        return false
      }

      const blockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      if (!isEqualSelectionPoints(at.focus, blockEndPoint)) {
        return false
      }

      if (!isTextBlockNode(snapshot.context, nextBlock.node)) {
        return false
      }

      return {nextBlock}
    },
    actions: [
      (_, {nextBlock}) => [
        raise({
          type: 'delete.block',
          at: nextBlock.path,
        }),
        raise({
          type: 'insert.block',
          block: nextBlock.node,
          placement: 'auto',
          select: 'none',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.block',
    actions: [
      ({event}) => [
        raise({
          type: 'delete',
          at: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: 0,
            },
          },
          unit: 'block',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.child',
    guard: ({snapshot, event}) => {
      const focusChild = getNode(snapshot.context, event.at)

      if (!focusChild) {
        return false
      }

      if (isSpan(snapshot.context, focusChild.node)) {
        return {
          selection: {
            anchor: {
              path: event.at,
              offset: 0,
            },
            focus: {
              path: event.at,
              offset: focusChild.node.text.length,
            },
          },
        }
      }

      return {
        selection: {
          anchor: {
            path: event.at,
            offset: 0,
          },
          focus: {
            path: event.at,
            offset: 0,
          },
        },
      }
    },
    actions: [(_, {selection}) => [raise({type: 'delete', at: selection})]],
  }),
  defineBehavior({
    on: 'delete.text',
    actions: [({event}) => [raise({...event, type: 'delete'})]],
  }),
]
