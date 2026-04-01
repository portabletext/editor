import {
  isSpan,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {getFocusChild} from '../selectors/selector.get-focus-child'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getNextBlock} from '../selectors/selector.get-next-block'
import {getPreviousBlock} from '../selectors/selector.get-previous-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {getAncestorTextBlock, getSibling} from '../traversal'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
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
  /**
   * Backward delete at the start of a text block inside a container merges
   * with the previous sibling text block within the same container.
   */
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

      const selectionStartPoint = getSelectionStartPoint(at)

      if (!selectionStartPoint) {
        return false
      }

      // Only handle container content (the next behavior handles top-level)
      if (
        getFocusTextBlock({
          ...snapshot,
          context: {...snapshot.context, selection: at},
        })
      ) {
        return false
      }

      const innerTextBlock = getAncestorTextBlock(
        snapshot,
        selectionStartPoint.path,
      )

      if (!innerTextBlock) {
        return false
      }

      const blockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: innerTextBlock,
      })

      if (!isEqualSelectionPoints(selectionStartPoint, blockStartPoint)) {
        return false
      }

      const previousSibling = getSibling(
        snapshot,
        innerTextBlock.path,
        'previous',
      )

      if (
        !previousSibling ||
        !isTextBlockNode(snapshot.context, previousSibling.node)
      ) {
        return false
      }

      const previousBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: {
          node: previousSibling.node as PortableTextBlock,
          path: previousSibling.path,
        },
      })

      return {
        innerTextBlock,
        previousSibling,
        previousBlockEndPoint,
      }
    },
    actions: [
      (_, {innerTextBlock, previousSibling, previousBlockEndPoint}) => {
        const previousBlock = previousSibling.node as PortableTextTextBlock
        const currentBlock = innerTextBlock.node as PortableTextTextBlock

        return [
          raise({
            type: 'set',
            at: previousSibling.path,
            props: {
              children: [...previousBlock.children, ...currentBlock.children],
            },
          }),
          raise({
            type: 'remove',
            at: innerTextBlock.path,
          }),
          raise({
            type: 'select',
            at: {
              anchor: previousBlockEndPoint,
              focus: previousBlockEndPoint,
            },
          }),
        ]
      },
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
  /**
   * Forward delete at the end of a text block inside a container merges
   * with the next sibling text block within the same container.
   */
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

      const selectionStartPoint = getSelectionStartPoint(at)

      if (!selectionStartPoint) {
        return false
      }

      if (
        getFocusTextBlock({
          ...snapshot,
          context: {...snapshot.context, selection: at},
        })
      ) {
        return false
      }

      const innerTextBlock = getAncestorTextBlock(
        snapshot,
        selectionStartPoint.path,
      )

      if (!innerTextBlock) {
        return false
      }

      const blockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: innerTextBlock,
      })

      if (!isEqualSelectionPoints(selectionStartPoint, blockEndPoint)) {
        return false
      }

      const nextSibling = getSibling(snapshot, innerTextBlock.path, 'next')

      if (
        !nextSibling ||
        !isTextBlockNode(snapshot.context, nextSibling.node)
      ) {
        return false
      }

      return {
        innerTextBlock,
        nextSibling,
        blockEndPoint,
      }
    },
    actions: [
      (_, {innerTextBlock, nextSibling, blockEndPoint}) => {
        const currentBlock = innerTextBlock.node as PortableTextTextBlock
        const nextBlock = nextSibling.node as PortableTextTextBlock

        return [
          raise({
            type: 'set',
            at: innerTextBlock.path,
            props: {
              children: [...currentBlock.children, ...nextBlock.children],
            },
          }),
          raise({
            type: 'remove',
            at: nextSibling.path,
          }),
          raise({
            type: 'select',
            at: {
              anchor: blockEndPoint,
              focus: blockEndPoint,
            },
          }),
        ]
      },
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
    actions: [({event}) => [raise({...event, type: 'delete'})]],
  }),
]
