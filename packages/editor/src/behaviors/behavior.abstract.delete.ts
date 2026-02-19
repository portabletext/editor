import {isSpan, isTextBlock} from '@portabletext/schema'
import {getFocusChild} from '../selectors/selector.get-focus-child'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeleteBehaviors = [
  defineBehavior({
    name: 'deleteBackwardRaise',
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
    name: 'deleteBackwardMergeBlocks',
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
      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (!previousBlock || !focusTextBlock) {
        return false
      }

      if (!isAtTheStartOfBlock(focusTextBlock)(adjustedSnapshot)) {
        return false
      }

      const previousBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: previousBlock,
      })

      if (!isTextBlock(snapshot.context, previousBlock.node)) {
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
    name: 'deleteForwardRaise',
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
    name: 'deleteForwardEmptyBlock',
    on: 'delete',
    guard: ({snapshot, event}) => {
      if (event.direction !== 'forward') {
        return false
      }

      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const nextBlock = getNextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      })
      const focusTextBlock = getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      })

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
    name: 'deleteForwardMergeBlocks',
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
      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!isAtTheEndOfBlock(focusTextBlock)(adjustedSnapshot)) {
        return false
      }

      if (!isTextBlock(snapshot.context, nextBlock.node)) {
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
    name: 'deleteBlock',
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
    name: 'deleteChild',
    on: 'delete.child',
    guard: ({snapshot, event}) => {
      const focusChild = getFocusChild({
        ...snapshot,
        context: {
          ...snapshot.context,
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
        },
      })

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
    name: 'deleteText',
    on: 'delete.text',
    actions: [({event}) => [raise({...event, type: 'delete'})]],
  }),
]
