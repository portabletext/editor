import {isSpan, isTextBlock} from '@portabletext/schema'
import {getFocusChild} from '../selectors/selector.get-focus-child'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {getTrimmedSelection} from '../selectors/selector.get-trimmed-selection'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {blockOffsetsToSelection} from '../utils/util.block-offsets-to-selection'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
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

      const previousBlock = getPreviousBlock(snapshot)
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!previousBlock || !focusTextBlock) {
        return false
      }

      if (!isAtTheStartOfBlock(focusTextBlock)(snapshot)) {
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
    on: 'delete',
    guard: ({snapshot, event}) => {
      if (event.direction !== 'forward') {
        return false
      }

      const nextBlock = getNextBlock(snapshot)
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!isAtTheEndOfBlock(focusTextBlock)(snapshot)) {
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
    on: 'delete.text',
    guard: ({snapshot, event}) => {
      const selection = blockOffsetsToSelection({
        context: snapshot.context,
        offsets: event.at,
      })

      if (!selection) {
        return false
      }

      const trimmedSelection = getTrimmedSelection({
        ...snapshot,
        context: {
          ...snapshot.context,
          value: snapshot.context.value,
          selection,
        },
      })

      if (!trimmedSelection) {
        return false
      }

      return {
        selection: trimmedSelection,
      }
    },
    actions: [(_, {selection}) => [raise({type: 'delete', at: selection})]],
  }),
]
