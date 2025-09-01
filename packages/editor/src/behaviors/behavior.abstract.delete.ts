import {isSpan, isTextBlock} from '@portabletext/schema'
import * as selectors from '../selectors'
import * as utils from '../utils'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeleteBehaviors = [
  defineBehavior({
    on: 'delete.backward',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      return {selection: snapshot.context.selection}
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'delete',
          direction: 'backward',
          unit: event.unit,
          at: selection,
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

      const previousBlock = selectors.getPreviousBlock(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (!previousBlock || !focusTextBlock) {
        return false
      }

      if (!selectors.isAtTheStartOfBlock(focusTextBlock)(snapshot)) {
        return false
      }

      const previousBlockEndPoint = utils.getBlockEndPoint({
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
      if (!snapshot.context.selection) {
        return false
      }

      return {selection: snapshot.context.selection}
    },
    actions: [
      ({event}, {selection}) => [
        raise({
          type: 'delete',
          direction: 'forward',
          unit: event.unit,
          at: selection,
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

      const nextBlock = selectors.getNextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.at,
        },
      })
      const focusTextBlock = selectors.getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.at,
        },
      })

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!utils.isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
        return false
      }

      const nextBlockStartPoint = utils.getBlockStartPoint({
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

      const nextBlock = selectors.getNextBlock(snapshot)
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (!nextBlock || !focusTextBlock) {
        return false
      }

      if (!selectors.isAtTheEndOfBlock(focusTextBlock)(snapshot)) {
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
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'delete.child',
    guard: ({snapshot, event}) => {
      const focusChild = selectors.getFocusChild({
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
      const selection = utils.blockOffsetsToSelection({
        context: snapshot.context,
        offsets: event.at,
      })

      if (!selection) {
        return false
      }

      const trimmedSelection = selectors.getTrimmedSelection({
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
