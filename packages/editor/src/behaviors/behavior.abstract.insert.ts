import {isTextBlockNode} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../engine/interfaces/path'
import {siblingPath} from '../engine/path/sibling-path'
import {serializePath} from '../paths/serialize-path'
import {isSelectionExpanded} from '../selectors'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getFocusInlineObject} from '../selectors/selector.get-focus-inline-object'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {comparePoints} from '../traversal/compare-points'
import {getCollapsedSpanBoundary} from '../traversal/get-collapsed-span-boundary'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {hasNode} from '../traversal/has-node'
import type {PickFromUnion} from '../type-utils'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {sliceTextBlock} from '../utils/util.slice-text-block'
import {moveTailActions} from './behavior.move-tail'
import {raise, type BehaviorAction} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'
import type {SyntheticBehaviorEvent} from './behavior.types.event'

function getUniqueBlockKey(
  snapshot: EditorSnapshot,
  blockKey: string | undefined,
): string {
  if (!blockKey) {
    return snapshot.context.keyGenerator()
  }

  if (snapshot.blockIndexMap.has(serializePath([{_key: blockKey}]))) {
    return snapshot.context.keyGenerator()
  }

  return blockKey
}

/**
 * Build a collapsed selection on the start of the block at `path`. Used to
 * anchor subsequent `insert.block` raises when chaining multiple inserts.
 */
function selectionAt(path: Path): {
  anchor: {path: Path; offset: number}
  focus: {path: Path; offset: number}
} {
  return {
    anchor: {path, offset: 0},
    focus: {path, offset: 0},
  }
}

/**
 * Build the canonical path for a new block about to be inserted as a sibling
 * of `referencePath`, or as a root-level block when `referencePath` is empty.
 */
function newBlockPath(referencePath: Path, key: string): Path {
  return referencePath.length === 0
    ? [{_key: key}]
    : siblingPath(referencePath, key)
}

export const abstractInsertBehaviors = [
  defineBehavior({
    on: '*',
    guard: ({snapshot, event}) => {
      if (
        event.type !== 'insert.block' &&
        event.type !== 'insert.blocks' &&
        event.type !== 'insert.block object'
      )
        return false
      return (
        event.at !== undefined &&
        [event.at.anchor, event.at.focus].some(
          (point) => !hasNode(snapshot, point.path),
        )
      )
    },
    actions: [() => []],
  }),
  defineBehavior({
    on: '*',
    guard: ({snapshot, event}) => {
      if (event.type !== 'insert.block' && event.type !== 'insert.blocks')
        return false
      const selection = event.at ?? snapshot.context.selection
      const point =
        selection &&
        (comparePoints(snapshot, selection.anchor, selection.focus) <= 0
          ? selection.focus
          : selection.anchor)
      const schema = point
        ? getPathSubSchema(snapshot, point.path)
        : snapshot.context.schema
      const blocks =
        event.type === 'insert.block' ? [event.block] : event.blocks
      return (
        blocks.length > 0 &&
        !blocks.some(
          (block) =>
            block._type === schema.block.name ||
            schema.blockObjects.some(({name}) => name === block._type),
        )
      )
    },
    actions: [() => []],
  }),
  defineBehavior({
    on: 'insert.block',
    guard: ({snapshot, event}) => {
      const selection = event.at ?? snapshot.context.selection
      if (
        event.placement !== 'auto' ||
        !selection ||
        isEqualSelectionPoints(selection.anchor, selection.focus) ||
        (!event.at &&
          event.select === 'none' &&
          !isTextBlockNode(snapshot.context, event.block) &&
          getCollapsedSpanBoundary(snapshot, selection))
      ) {
        return false
      }
      const startPoint =
        comparePoints(snapshot, selection.anchor, selection.focus) <= 0
          ? selection.anchor
          : selection.focus
      const live = snapshot.context.selection
      const independent =
        event.at &&
        live &&
        (!isEqualSelectionPoints(live.anchor, selection.anchor) ||
          !isEqualSelectionPoints(live.focus, selection.focus))
      return {selection, startPoint, independent}
    },
    actions: [
      ({event}, {selection, independent}) => [
        raise({type: 'select', at: selection}),
        raise({type: 'delete', at: selection}),
        raise(event, ({snapshot}) => {
          const selection = snapshot.context.selection
          if (!selection) return {...event, at: undefined}
          const startPoint =
            comparePoints(snapshot, selection.anchor, selection.focus) <= 0
              ? selection.anchor
              : selection.focus
          const atLiveCaret =
            !independent &&
            event.select === 'none' &&
            !isTextBlockNode(snapshot.context, event.block) &&
            getCollapsedSpanBoundary(snapshot, selection)
          return {
            ...event,
            at: atLiveCaret
              ? undefined
              : {anchor: startPoint, focus: startPoint},
          }
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.block',
    guard: ({snapshot, event}) => {
      const selection = event.at ?? snapshot.context.selection
      if (
        event.placement !== 'auto' ||
        isTextBlockNode(snapshot.context, event.block) ||
        !selection ||
        !isEqualSelectionPoints(selection.anchor, selection.focus)
      ) {
        return false
      }
      const live = snapshot.context.selection
      if (
        event.at &&
        live &&
        (!isEqualSelectionPoints(live.anchor, selection.anchor) ||
          !isEqualSelectionPoints(live.focus, selection.focus))
      )
        return false
      const targetSnapshot = {
        ...snapshot,
        context: {...snapshot.context, selection},
      }
      const textBlock = getFocusTextBlock(targetSnapshot)
      if (
        !textBlock ||
        isEmptyTextBlock(snapshot.context, textBlock.node) ||
        isEqualSelectionPoints(
          selection.anchor,
          getBlockStartPoint({context: snapshot.context, block: textBlock}),
        ) ||
        isEqualSelectionPoints(
          selection.anchor,
          getBlockEndPoint({context: snapshot.context, block: textBlock}),
        )
      ) {
        return false
      }
      return {selection, textBlock}
    },
    actions: [
      ({event}, {selection, textBlock}) => [
        raise({type: 'select', at: selection}),
        raise({type: 'split'}),
        raise({...event, placement: 'after', at: selectionAt(textBlock.path)}),
        ...(event.select === 'none'
          ? [raise({type: 'select', at: selection})]
          : []),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.blocks',
    guard: ({event}) => {
      const onlyBlock =
        event.blocks.length === 1 ? event.blocks.at(0) : undefined

      if (!onlyBlock) {
        return false
      }

      return {onlyBlock}
    },
    actions: [
      ({event}, {onlyBlock}) => [
        raise({
          type: 'insert.block',
          block: onlyBlock,
          placement: event.placement,
          select: event.select ?? 'end',
          ...(event.at ? {at: event.at} : {}),
        }),
      ],
    ],
  }),

  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'before' && event.placement !== 'after') {
        return false
      }

      const referenceSelection = event.at ?? snapshot.context.selection

      const referenceBlock = referenceSelection
        ? getFocusBlock({
            ...snapshot,
            context: {...snapshot.context, selection: referenceSelection},
          })
        : undefined

      const referenceBlockPath: Path = referenceBlock ? referenceBlock.path : []

      return {referenceBlockPath}
    },
    actions: [
      ({snapshot, event}, {referenceBlockPath}) => {
        const {actions, firstBlockPath, lastBlockPath} = raiseSequentialInserts(
          snapshot,
          event,
          referenceBlockPath,
        )

        const select = event.select ?? 'end'

        if (select === 'start' && firstBlockPath) {
          actions.push(
            raise({
              type: 'select.block',
              at: firstBlockPath,
              select: 'start',
            }),
          )
        }

        if (select === 'end' && lastBlockPath) {
          actions.push(
            raise({
              type: 'select.block',
              at: lastBlockPath,
              select: 'end',
            }),
          )
        }

        return actions
      },
    ],
  }),

  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'auto') {
        return false
      }

      const selection = event.at ?? snapshot.context.selection

      if (!selection) {
        return false
      }

      const at =
        event.blocks.length > 1 &&
        comparePoints(snapshot, selection.anchor, selection.focus) > 0
          ? {anchor: selection.focus, focus: selection.anchor}
          : selection

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      const focusTextBlock = getFocusTextBlock(adjustedSnapshot)

      if (
        !focusTextBlock ||
        isEmptyTextBlock(snapshot.context, focusTextBlock.node)
      ) {
        return false
      }

      const focusBlockStartPoint = getBlockStartPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      const focusBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: focusTextBlock,
      })
      const focusTextBlockAfter = sliceTextBlock({
        context: snapshot.context,
        block: focusTextBlock.node,
        startPoint: at.focus,
        endPoint: focusBlockEndPoint,
      })

      const isFirstBlockTextBlock = isTextBlockNode(
        snapshot.context,
        event.blocks.at(0),
      )

      return {
        focusTextBlock,
        focusBlockStartPoint,
        focusBlockEndPoint,
        focusTextBlockAfter,
        at,
        originalSelection: snapshot.context.selection,
        isFirstBlockTextBlock,
      }
    },
    actions: [
      (
        {snapshot, event},
        {
          focusTextBlock,
          focusBlockEndPoint,
          focusTextBlockAfter,
          at,
          focusBlockStartPoint,
          isFirstBlockTextBlock,
          originalSelection,
        },
      ) => {
        const referenceBlockPath = focusTextBlock.path
        let previousBlockPath: Path | undefined
        let firstBlockPath: Path | undefined
        const actions: Array<BehaviorAction> = []
        const keepSuffix = isEqualSelectionPoints(
          at.focus,
          focusBlockStartPoint,
        )

        if (
          keepSuffix &&
          event.blocks.length === 0 &&
          !isEqualSelectionPoints(at.anchor, at.focus)
        ) {
          actions.push(raise({type: 'select', at}), raise({type: 'delete', at}))
        }

        let index = -1
        for (const block of event.blocks) {
          index++

          if (index === 0) {
            if (
              !keepSuffix &&
              !isEqualSelectionPoints(at.focus, focusBlockEndPoint)
            ) {
              actions.push(...moveTailActions(snapshot, at.focus))
            }

            const key = getUniqueBlockKey(snapshot, block._key)

            const deletingEndToEnd = isEqualSelectionPoints(
              at.focus,
              focusBlockStartPoint,
            )

            if (isTextBlockNode(snapshot.context, block) && !deletingEndToEnd) {
              firstBlockPath = focusTextBlock.path
              previousBlockPath = focusTextBlock.path
            } else {
              firstBlockPath = newBlockPath(referenceBlockPath, key)
              previousBlockPath = firstBlockPath
            }

            actions.push(
              raise({
                type: 'insert.block',
                block: key !== block._key ? {...block, _key: key} : block,
                placement: 'auto',
                select: 'end',
                ...(event.at ? {at: event.at} : {}),
              }),
            )

            continue
          }

          const key = getUniqueBlockKey(snapshot, block._key)
          const insertion: PickFromUnion<
            SyntheticBehaviorEvent,
            'type',
            'insert.block'
          > = {
            type: 'insert.block',
            block: key !== block._key ? {...block, _key: key} : block,
            placement: 'after',
            select:
              index === event.blocks.length - 1 || !previousBlockPath
                ? 'end'
                : 'none',
            at: previousBlockPath ? selectionAt(previousBlockPath) : undefined,
          }

          actions.push(
            raise(
              insertion,
              index === 1 && !isEqualSelectionPoints(at.anchor, at.focus)
                ? ({snapshot}) => ({
                    ...insertion,
                    at: snapshot.context.selection ?? undefined,
                  })
                : undefined,
            ),
          )

          previousBlockPath = newBlockPath(referenceBlockPath, key)
        }

        if (
          !keepSuffix &&
          !isEmptyTextBlock(snapshot.context, focusTextBlockAfter)
        ) {
          actions.push(
            raise({
              type: 'insert.block',
              block: focusTextBlockAfter,
              placement: 'auto',
              select: (event.select ?? 'end') === 'end' ? 'none' : 'end',
              ...(event.blocks.length > 1 &&
              !isEqualSelectionPoints(at.anchor, at.focus) &&
              isEqualSelectionPoints(at.focus, focusBlockStartPoint)
                ? {at: selectionAt(focusTextBlock.path)}
                : {}),
            }),
          )
        }

        if (event.select === 'none') {
          actions.push(
            raise({
              type: 'select',
              at: originalSelection,
            }),
          )
        }

        if (event.select === 'start') {
          if (
            (isEqualSelectionPoints(at.focus, focusBlockStartPoint) ||
              !isFirstBlockTextBlock) &&
            firstBlockPath
          ) {
            actions.push(
              raise({
                type: 'select.block',
                at: firstBlockPath,
                select: 'start',
              }),
            )
          } else {
            actions.push(
              raise({
                type: 'select',
                at: {
                  anchor: at.focus,
                  focus: at.focus,
                },
              }),
            )
          }
        }

        return actions
      },
    ],
  }),

  defineBehavior({
    on: 'insert.blocks',
    guard: ({snapshot, event}) => {
      if (event.placement !== 'auto') {
        return false
      }

      const referenceSelection = event.at ?? snapshot.context.selection

      const referenceBlock = referenceSelection
        ? getFocusBlock({
            ...snapshot,
            context: {...snapshot.context, selection: referenceSelection},
          })
        : undefined

      const referenceBlockPath: Path = referenceBlock ? referenceBlock.path : []

      return {
        referenceBlockPath,
        originalSelection: snapshot.context.selection,
      }
    },
    actions: [
      ({snapshot, event}, {referenceBlockPath, originalSelection}) => {
        const {actions, firstBlockPath, lastBlockPath} = raiseSequentialInserts(
          snapshot,
          event,
          referenceBlockPath,
        )

        const select = event.select ?? 'end'

        if (select === 'none') {
          actions.push(
            raise({
              type: 'select',
              at: originalSelection,
            }),
          )
        } else if (select === 'start' && firstBlockPath) {
          actions.push(
            raise({
              type: 'select.block',
              at: firstBlockPath,
              select: 'start',
            }),
          )
        } else if (lastBlockPath) {
          actions.push(
            raise({
              type: 'select.block',
              at: lastBlockPath,
              select: 'end',
            }),
          )
        }

        return actions
      },
    ],
  }),
  defineBehavior({
    on: 'insert.break',
    actions: [() => [raise({type: 'split'})]],
  }),
  defineBehavior({
    on: 'insert.child',
    guard: ({snapshot}) => {
      const lastBlock = getLastBlock(snapshot)

      if (!lastBlock) {
        return false
      }

      if (snapshot.context.selection) {
        return false
      }

      const lastBlockEndPoint = getBlockEndPoint({
        context: snapshot.context,
        block: lastBlock,
      })

      return {lastBlockEndPoint}
    },
    actions: [
      ({event}, {lastBlockEndPoint}) => [
        raise({
          type: 'select',
          at: {
            anchor: lastBlockEndPoint,
            focus: lastBlockEndPoint,
          },
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.child',
    guard: ({snapshot}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      return snapshot.context.selection && !focusTextBlock
    },
    actions: [
      ({snapshot, event}) => [
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
          placement: 'auto',
          select: 'end',
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.inline object',
    actions: [
      ({event}) => [
        raise({
          type: 'insert.child',
          child: {
            _type: event.inlineObject.name,
            ...event.inlineObject.value,
          },
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.soft break',
    actions: [() => [raise({type: 'insert.text', text: '\n'})]],
  }),
  defineBehavior({
    on: 'insert.span',
    guard: ({snapshot}) => !getFocusTextBlock(snapshot),
    actions: [
      ({snapshot, event}) => [
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
          placement: 'auto',
          select: 'end',
        }),
        raise(event),
      ],
    ],
  }),
  defineBehavior({
    on: 'insert.span',
    guard: ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)
      const markDefs =
        event.annotations?.map((annotation) => ({
          _type: annotation.name,
          _key: snapshot.context.keyGenerator(),
          ...annotation.value,
        })) ?? []

      return {markDefs, focusTextBlock}
    },
    actions: [
      ({snapshot, event}, {markDefs, focusTextBlock}) => [
        ...(focusTextBlock
          ? [
              raise({
                type: 'block.set',
                at: focusTextBlock.path,
                props: {
                  markDefs: [
                    ...(focusTextBlock.node.markDefs ?? []),
                    ...markDefs,
                  ],
                },
              }),
            ]
          : []),
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: event.text,
            marks: [
              ...(event.decorators ?? []),
              ...markDefs.map((markDef) => markDef._key),
            ],
          },
        }),
      ],
    ],
  }),

  /**
   * When the selection is on an inline object, move the selection past it
   * before inserting text.
   */
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) =>
      (event.at === undefined || event.offset === undefined) &&
      isSelectionCollapsed(snapshot) &&
      getFocusInlineObject(snapshot),
    actions: [
      ({event}) => [raise({type: 'move.forward', distance: 1}), raise(event)],
    ],
  }),

  /**
   * If there's an expanded selection, then we delete the selection before we
   * insert the text.
   */
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      if (event.at !== undefined && event.offset !== undefined) {
        return false
      }

      return isSelectionExpanded(snapshot)
    },
    actions: [({event}) => [raise({type: 'delete'}), raise(event)]],
  }),

  /**
   * If there's no selection, then we select the end of the editor before we
   * we insert the text.
   */
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      if (event.at !== undefined && event.offset !== undefined) {
        return false
      }

      if (snapshot.context.selection) {
        return false
      }

      const lastBlok = getLastBlock(snapshot)

      if (!lastBlok) {
        return false
      }

      const endPoint = getBlockEndPoint({
        context: snapshot.context,
        block: lastBlok,
      })
      return {endPoint}
    },
    actions: [
      ({event}, {endPoint}) => [
        raise({
          type: 'select',
          at: {
            anchor: endPoint,
            focus: endPoint,
          },
        }),
        raise(event),
      ],
    ],
  }),
]

function raiseSequentialInserts(
  snapshot: EditorSnapshot,
  event: PickFromUnion<SyntheticBehaviorEvent, 'type', 'insert.blocks'>,
  referenceBlockPath: Path,
): {
  actions: Array<BehaviorAction>
  firstBlockPath: Path | undefined
  lastBlockPath: Path | undefined
} {
  let firstBlockPath: Path | undefined
  let lastBlockPath: Path | undefined
  let previousBlockPath: Path | undefined
  const actions: Array<BehaviorAction> = []

  let index = -1
  for (const block of event.blocks) {
    index++
    const key = getUniqueBlockKey(snapshot, block._key)
    const blockPath: Path = newBlockPath(referenceBlockPath, key)

    if (index === 0) {
      firstBlockPath = blockPath
    }

    if (index === event.blocks.length - 1) {
      lastBlockPath = blockPath
    }

    actions.push(
      raise({
        type: 'insert.block',
        block: key !== block._key ? {...block, _key: key} : block,
        placement: index === 0 ? event.placement : 'after',
        select: 'none',
        ...(previousBlockPath
          ? {at: selectionAt(previousBlockPath)}
          : event.at
            ? {at: event.at}
            : {}),
      }),
    )

    previousBlockPath = blockPath
  }

  return {actions, firstBlockPath, lastBlockPath}
}
