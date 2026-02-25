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
import {effect, raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

/**
 * Calculate the total text length of a text block by summing all span text lengths.
 */
function getTextBlockLength(
  context: {schema: {span: {name: string}}},
  block: {children: Array<{_type: string; text?: string}>},
): number {
  const spanTypeName = context.schema.span.name
  return block.children.reduce((total, child) => {
    if (child._type === spanTypeName && typeof child.text === 'string') {
      return total + child.text.length
    }
    return total
  }, 0)
}

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

      // Prepare merge context data for decoration tracking
      // Block indices will be computed in the effect where we have access to slateEditor
      const mergeContextData = {
        deletedBlockKey: focusTextBlock.node._key,
        targetBlockKey: previousBlock.node._key,
        targetBlockTextLength: getTextBlockLength(
          snapshot.context,
          previousBlock.node,
        ),
        targetOriginalChildCount: previousBlock.node.children.length,
      }

      return {previousBlockEndPoint, focusTextBlock, mergeContextData}
    },
    actions: [
      (_, {previousBlockEndPoint, focusTextBlock, mergeContextData}) => [
        effect(({slateEditor}) => {
          // Look up block indices while blocks still exist (before operations are applied)
          const deletedBlockIndex = slateEditor.blockIndexMap.get(
            mergeContextData.deletedBlockKey,
          )
          const targetBlockIndex = slateEditor.blockIndexMap.get(
            mergeContextData.targetBlockKey,
          )

          // Only set merge context if we can find both blocks
          if (
            deletedBlockIndex !== undefined &&
            targetBlockIndex !== undefined
          ) {
            slateEditor.mergeContext = {
              ...mergeContextData,
              deletedBlockIndex,
              targetBlockIndex,
            }
          }
        }),
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
        effect(({slateEditor}) => {
          slateEditor.mergeContext = null
          slateEditor.mergeDeletedBlockFlags = null
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

      // Prepare merge context data for decoration tracking
      // For forward delete: focusTextBlock is target, nextBlock is being deleted
      // Block indices will be computed in the effect where we have access to slateEditor
      const mergeContextData = {
        deletedBlockKey: nextBlock.node._key,
        targetBlockKey: focusTextBlock.node._key,
        targetBlockTextLength: getTextBlockLength(
          snapshot.context,
          focusTextBlock.node,
        ),
        targetOriginalChildCount: focusTextBlock.node.children.length,
      }

      return {nextBlock, mergeContextData}
    },
    actions: [
      (_, {nextBlock, mergeContextData}) => [
        effect(({slateEditor}) => {
          // Look up block indices while blocks still exist (before operations are applied)
          const deletedBlockIndex = slateEditor.blockIndexMap.get(
            mergeContextData.deletedBlockKey,
          )
          const targetBlockIndex = slateEditor.blockIndexMap.get(
            mergeContextData.targetBlockKey,
          )

          // Only set merge context if we can find both blocks
          if (
            deletedBlockIndex !== undefined &&
            targetBlockIndex !== undefined
          ) {
            slateEditor.mergeContext = {
              ...mergeContextData,
              deletedBlockIndex,
              targetBlockIndex,
            }
          }
        }),
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
        effect(({slateEditor}) => {
          slateEditor.mergeContext = null
          slateEditor.mergeDeletedBlockFlags = null
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
