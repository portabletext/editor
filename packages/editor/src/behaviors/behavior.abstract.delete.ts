import {
  isSpan,
  isTextBlock,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {isEqualMarks} from '../internal-utils/equality'
import {getFocusChild} from '../selectors/selector.get-focus-child'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isAtTheEndOfBlock} from '../selectors/selector.is-at-the-end-of-block'
import {isAtTheStartOfBlock} from '../selectors/selector.is-at-the-start-of-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {getSibling} from '../traversal/get-sibling'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {raise, type BehaviorAction} from './behavior.types.action'
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

      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (!focusTextBlock) {
        return false
      }

      const previousSibling = getSibling(
        adjustedSnapshot,
        focusTextBlock.path,
        {direction: 'previous'},
      )

      if (!previousSibling) {
        return false
      }

      if (!isAtTheStartOfBlock(focusTextBlock)(adjustedSnapshot)) {
        return false
      }

      if (!isTextBlock(snapshot.context, previousSibling.node)) {
        return false
      }

      const previousBlock = {
        node: previousSibling.node,
        path: previousSibling.path,
      }

      const previousBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: previousBlock,
      })

      const {renamedBlock, renameActions} = planMergeKeyRenames({
        context: snapshot.context,
        mergingBlockPath: focusTextBlock.path,
        mergingBlock: focusTextBlock.node,
        destinationBlock: previousBlock.node,
      })

      return {
        previousBlockEndPoint,
        focusTextBlock,
        renamedBlock,
        renameActions,
      }
    },
    actions: [
      (
        _,
        {previousBlockEndPoint, focusTextBlock, renamedBlock, renameActions},
      ) => [
        ...renameActions,
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
          block: renamedBlock,
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

      if (!isSelectionCollapsed(adjustedSnapshot)) {
        return false
      }

      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (!focusTextBlock) {
        return false
      }

      const nextSibling = getSibling(adjustedSnapshot, focusTextBlock.path, {
        direction: 'next',
      })

      if (!nextSibling) {
        return false
      }

      if (!isEmptyTextBlock(snapshot.context, focusTextBlock.node)) {
        return false
      }

      if (!isTextBlock(snapshot.context, nextSibling.node)) {
        return false
      }

      const nextBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: {node: nextSibling.node, path: nextSibling.path},
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

      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (!focusTextBlock) {
        return false
      }

      const nextSibling = getSibling(adjustedSnapshot, focusTextBlock.path, {
        direction: 'next',
      })

      if (!nextSibling) {
        return false
      }

      if (!isAtTheEndOfBlock(focusTextBlock)(adjustedSnapshot)) {
        return false
      }

      if (!isTextBlockNode(snapshot.context, nextSibling.node)) {
        return false
      }

      return {nextBlock: {node: nextSibling.node, path: nextSibling.path}}
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

/**
 * A block merge folds `mergingBlock`'s children (and markDefs) into
 * `destinationBlock` by key. Any key the merging block shares with the
 * destination has to be renamed before the merge, or `insert.block`'s own
 * collision handling mints a fresh key for it, which reads on the wire as
 * that node being destroyed and a new one created instead of moved.
 *
 * Renames are raised as `set`/`child.set` events against the still-living
 * `mergingBlock`, so they land on the wire before the merge's `unset`.
 * `renamedBlock` mirrors the same renames applied to the value the caller
 * already captured, since raising the rename events now doesn't change
 * that captured value.
 */
function planMergeKeyRenames(args: {
  context: {schema: Schema; keyGenerator: () => string}
  mergingBlockPath: Path
  mergingBlock: PortableTextTextBlock
  destinationBlock: PortableTextTextBlock
}): {
  renamedBlock: PortableTextTextBlock
  renameActions: Array<BehaviorAction>
} {
  const {context, mergingBlockPath, mergingBlock, destinationBlock} = args

  const destinationChildKeys = new Set(
    destinationBlock.children.map((child) => child._key),
  )
  const destinationMarkDefKeys = new Set(
    (destinationBlock.markDefs ?? []).map((markDef) => markDef._key),
  )

  const markDefKeyMap = new Map<string, string>()
  const renamedMarkDefs = mergingBlock.markDefs?.map((markDef) => {
    if (!destinationMarkDefKeys.has(markDef._key)) {
      return markDef
    }

    const newKey = context.keyGenerator()
    markDefKeyMap.set(markDef._key, newKey)
    return {...markDef, _key: newKey}
  })

  const renameActions: Array<BehaviorAction> = []

  for (const markDef of mergingBlock.markDefs ?? []) {
    const newKey = markDefKeyMap.get(markDef._key)

    if (newKey) {
      renameActions.push(
        raise({
          type: 'set',
          at: [...mergingBlockPath, 'markDefs', {_key: markDef._key}, '_key'],
          value: newKey,
        }),
      )
    }
  }

  const renamedChildren = mergingBlock.children.map((child) => {
    const currentMarks = isSpan(context, child) ? child.marks : undefined
    const remappedMarks = currentMarks?.map(
      (mark) => markDefKeyMap.get(mark) ?? mark,
    )
    const marksChanged = Boolean(
      remappedMarks && !isEqualMarks(remappedMarks, currentMarks),
    )

    const newKey = destinationChildKeys.has(child._key)
      ? context.keyGenerator()
      : child._key

    const props: Record<string, unknown> = {}
    if (newKey !== child._key) {
      props['_key'] = newKey
    }
    if (marksChanged) {
      props['marks'] = remappedMarks
    }

    if (Object.keys(props).length > 0) {
      renameActions.push(
        raise({
          type: 'child.set',
          at: [...mergingBlockPath, 'children', {_key: child._key}],
          props,
        }),
      )
    }

    return marksChanged
      ? {...child, _key: newKey, marks: remappedMarks}
      : {...child, _key: newKey}
  })

  return {
    renamedBlock: {
      ...mergingBlock,
      children: renamedChildren,
      ...(mergingBlock.markDefs ? {markDefs: renamedMarkDefs} : {}),
    },
    renameActions,
  }
}
