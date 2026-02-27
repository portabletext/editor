import {isTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {isSelectionExpanded} from '../selectors'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getLastBlock} from '../selectors/selector.get-last-block'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {sliceTextBlock} from '../utils/util.slice-text-block'
import {raise, type BehaviorAction} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

function getUniqueBlockKey(
  blockKey: string | undefined,
): EditorSelector<string> {
  return (snapshot) => {
    if (!blockKey) {
      return snapshot.context.keyGenerator()
    }

    if (snapshot.blockPathMap.has(blockKey)) {
      return snapshot.context.keyGenerator()
    }

    return blockKey
  }
}

export const abstractInsertBehaviors = [
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
    guard: ({event}) =>
      event.placement === 'before' || event.placement === 'after',
    actions: [
      ({snapshot, event}) => {
        let firstBlockKey: string | undefined
        let lastBlockKey: string | undefined
        let previousBlockKey: string | undefined
        const actions: Array<BehaviorAction> = []

        let index = -1
        for (const block of event.blocks) {
          index++
          const key = getUniqueBlockKey(block._key)(snapshot)

          if (index === 0) {
            firstBlockKey = key
          }

          if (index === event.blocks.length - 1) {
            lastBlockKey = key
          }

          actions.push(
            raise({
              type: 'insert.block',
              block: key !== block._key ? {...block, _key: key} : block,
              placement:
                event.placement === 'after'
                  ? 'after'
                  : index === 0
                    ? 'before'
                    : 'after',
              select: 'none',
              ...(previousBlockKey
                ? {
                    at: {
                      anchor: {path: [{_key: previousBlockKey}], offset: 0},
                      focus: {path: [{_key: previousBlockKey}], offset: 0},
                    },
                  }
                : event.at
                  ? {at: event.at}
                  : {}),
            }),
          )

          previousBlockKey = key
        }

        const select = event.select ?? 'end'

        if (select === 'start' && firstBlockKey) {
          actions.push(
            raise({
              type: 'select.block',
              at: [{_key: firstBlockKey}],
              select: 'start',
            }),
          )
        }

        if (select === 'end' && lastBlockKey) {
          actions.push(
            raise({
              type: 'select.block',
              at: [{_key: lastBlockKey}],
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
        context: {
          schema: snapshot.context.schema,
          selection: {
            anchor: at.focus,
            focus: focusBlockEndPoint,
          },
        },
        block: focusTextBlock.node,
      })

      const isFirstBlockTextBlock = isTextBlock(
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
        let previousBlockKey: string | undefined
        let firstBlockKey: string | undefined
        const actions: Array<BehaviorAction> = []

        let index = -1
        for (const block of event.blocks) {
          index++

          if (index === 0) {
            if (!isEqualSelectionPoints(at.focus, focusBlockEndPoint)) {
              actions.push(
                raise({
                  type: 'delete',
                  at: {
                    anchor: at.focus,
                    focus: focusBlockEndPoint,
                  },
                }),
              )
            }

            const key = getUniqueBlockKey(block._key)(snapshot)

            const deletingEndToEnd = isEqualSelectionPoints(
              at.focus,
              focusBlockStartPoint,
            )

            if (isTextBlock(snapshot.context, block) && !deletingEndToEnd) {
              firstBlockKey = focusTextBlock.node._key
              previousBlockKey = focusTextBlock.node._key
            } else {
              firstBlockKey = key
              previousBlockKey = key
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

          if (index === event.blocks.length - 1) {
            actions.push(
              raise({
                type: 'insert.block',
                block,
                placement: 'after',
                select: 'end',
                at: previousBlockKey
                  ? {
                      anchor: {path: [{_key: previousBlockKey}], offset: 0},
                      focus: {path: [{_key: previousBlockKey}], offset: 0},
                    }
                  : undefined,
              }),
            )

            continue
          }

          const key = getUniqueBlockKey(block._key)(snapshot)

          actions.push(
            raise({
              type: 'insert.block',
              block: key !== block._key ? {...block, _key: key} : block,
              placement: 'after',
              select: previousBlockKey ? 'none' : 'end',
              at: previousBlockKey
                ? {
                    anchor: {path: [{_key: previousBlockKey}], offset: 0},
                    focus: {path: [{_key: previousBlockKey}], offset: 0},
                  }
                : undefined,
            }),
          )

          previousBlockKey = key
        }

        if (!isEmptyTextBlock(snapshot.context, focusTextBlockAfter)) {
          actions.push(
            raise({
              type: 'insert.block',
              block: focusTextBlockAfter,
              placement: 'auto',
              select: event.select === 'end' ? 'none' : 'end',
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
            firstBlockKey
          ) {
            actions.push(
              raise({
                type: 'select.block',
                at: [{_key: firstBlockKey}],
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

      return {originalSelection: snapshot.context.selection}
    },
    actions: [
      ({snapshot, event}, {originalSelection}) => {
        let firstBlockKey: string | undefined
        let lastBlockKey: string | undefined
        let previousBlockKey: string | undefined
        const actions: Array<BehaviorAction> = []

        let index = -1
        for (const block of event.blocks) {
          index++
          const key = getUniqueBlockKey(block._key)(snapshot)

          if (index === 0) {
            firstBlockKey = key
          }

          if (index === event.blocks.length - 1) {
            lastBlockKey = key
          }

          actions.push(
            raise({
              type: 'insert.block',
              block: key !== block._key ? {...block, _key: key} : block,
              placement: index === 0 ? 'auto' : 'after',
              select: 'none',
              ...(previousBlockKey
                ? {
                    at: {
                      anchor: {path: [{_key: previousBlockKey}], offset: 0},
                      focus: {path: [{_key: previousBlockKey}], offset: 0},
                    },
                  }
                : event.at
                  ? {at: event.at}
                  : {}),
            }),
          )

          previousBlockKey = key
        }

        const select = event.select ?? 'end'

        if (select === 'none') {
          actions.push(
            raise({
              type: 'select',
              at: originalSelection,
            }),
          )
        } else if (select === 'start' && firstBlockKey) {
          actions.push(
            raise({
              type: 'select.block',
              at: [{_key: firstBlockKey}],
              select: 'start',
            }),
          )
        } else if (lastBlockKey) {
          actions.push(
            raise({
              type: 'select.block',
              at: [{_key: lastBlockKey}],
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
   * If there's an expanded selection, then we delete the selection before we
   * insert the text.
   */
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot}) => {
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
    guard: ({snapshot}) => {
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
