import {
  and,
  assign,
  fromCallback,
  setup,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {isDeepEqual} from '../internal-utils/equality'
import {
  moveRangeByMergeAwareOperation,
  moveRangeBySplitAwareOperation,
} from '../internal-utils/move-range-by-operation'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {
  Element,
  Path,
  Range,
  type BaseRange,
  type NodeEntry,
  type Operation,
} from '../slate'
import type {EditorSelection, RangeDecoration} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isEmptyTextBlock} from '../utils'
import type {EditorSchema} from './editor-schema'

const slateOperationCallback: CallbackLogicFunction<
  AnyEventObject,
  | {type: 'slate operation'; operation: Operation; suppressCallback: boolean}
  | {type: 'reconcile decorations'},
  {slateEditor: PortableTextSlateEditor}
> = ({input, sendBack}) => {
  const originalApply = input.slateEditor.apply

  // Tracks whether we're in a remote batch. Set on first remote op, cleared
  // when the microtask fires. Stays true through normalization ops that follow
  // the remote batch (they're consequences of remote changes, not local edits).
  let pendingReconciliation = false
  let microtaskScheduled = false

  input.slateEditor.apply = (op) => {
    // Apply the operation first, THEN notify the decoration machine.
    // This is critical because:
    // 1. moveRangeBySplitAwareOperation may return ranges pointing to new blocks
    // 2. slateRangeToSelection needs to look up blocks by path index
    // 3. If we notify before apply, the new block doesn't exist yet
    // 4. This causes slateRangeToSelection to return null (decoration invalidated)
    originalApply(op)

    if (op.type === 'set_selection') {
      return
    }

    const isRemoteBatch =
      input.slateEditor.isProcessingRemoteChanges || pendingReconciliation

    // On first remote op, snapshot current decoration ranges and schedule
    // a microtask to fire batched onMoved callbacks after the batch completes.
    //
    // Timing guarantee: withRemoteChanges() is synchronous, and normalize()
    // + onChange() run synchronously after it. The JS event loop processes
    // microtasks before the next task (user input events), so no real local
    // operations can sneak in between the remote batch and reconciliation.
    if (isRemoteBatch && !pendingReconciliation) {
      pendingReconciliation = true
      // Snapshot pre-batch state for diffing at reconciliation time
      const snapshot = new Map<
        RangeDecoration,
        {range: Range | null; selection: EditorSelection}
      >()
      for (const dr of input.slateEditor.decoratedRanges) {
        snapshot.set(dr.rangeDecoration, {
          range: Range.isRange(dr)
            ? {anchor: {...dr.anchor}, focus: {...dr.focus}}
            : null,
          selection: dr.rangeDecoration.selection,
        })
      }
      input.slateEditor.preBatchDecorationRanges = snapshot
    }

    // Always send the operation — Point.transform handles offset shifts
    // correctly for same-span operations. During remote batches, the
    // suppressCallback flag tells the handler to skip onMoved calls.
    sendBack({
      type: 'slate operation',
      operation: op,
      suppressCallback: isRemoteBatch,
    })

    // Schedule microtask once per batch. Fires after all synchronous code
    // (remote ops + normalization + onChange) completes.
    if (isRemoteBatch && !microtaskScheduled) {
      microtaskScheduled = true
      Promise.resolve().then(() => {
        pendingReconciliation = false
        microtaskScheduled = false
        sendBack({type: 'reconcile decorations'})
      })
    }
  }

  return () => {
    input.slateEditor.apply = originalApply
  }
}

export type DecoratedRange = BaseRange & {rangeDecoration: RangeDecoration}

export const rangeDecorationsMachine = setup({
  types: {
    context: {} as {
      pendingRangeDecorations: Array<RangeDecoration>
      skipSetup: boolean
      readOnly: boolean
      schema: EditorSchema
      slateEditor: PortableTextSlateEditor
      decorate: {fn: (nodeEntry: NodeEntry) => Array<BaseRange>}
    },
    input: {} as {
      rangeDecorations: Array<RangeDecoration>
      readOnly: boolean
      schema: EditorSchema
      skipSetup: boolean
      slateEditor: PortableTextSlateEditor
    },
    events: {} as
      | {
          type: 'ready'
        }
      | {
          type: 'range decorations updated'
          rangeDecorations: Array<RangeDecoration>
        }
      | {
          type: 'slate operation'
          operation: Operation
          suppressCallback?: boolean
        }
      | {
          type: 'reconcile decorations'
        }
      | {
          type: 'update read only'
          readOnly: boolean
        },
  },
  actions: {
    'update pending range decorations': assign({
      pendingRangeDecorations: ({context, event}) => {
        if (event.type !== 'range decorations updated') {
          return context.pendingRangeDecorations
        }

        return event.rangeDecorations
      },
    }),
    'set up initial range decorations': ({context}) => {
      const rangeDecorationState: Array<DecoratedRange> = []

      for (const rangeDecoration of context.pendingRangeDecorations) {
        const slateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.value,
            selection: rangeDecoration.selection,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!Range.isRange(slateRange)) {
          rangeDecoration.onMoved?.({
            previousSelection: rangeDecoration.selection,
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...slateRange,
        })
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },
    'update range decorations': ({context, event}) => {
      if (event.type !== 'range decorations updated') {
        return
      }

      const rangeDecorationState: Array<DecoratedRange> = []

      for (const rangeDecoration of event.rangeDecorations) {
        const slateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.value,
            selection: rangeDecoration.selection,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!Range.isRange(slateRange)) {
          rangeDecoration.onMoved?.({
            previousSelection: rangeDecoration.selection,
            newSelection: null,
            rangeDecoration,
            origin: 'local',
          })
          continue
        }

        rangeDecorationState.push({
          rangeDecoration,
          ...slateRange,
        })
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },

    'move range decorations': ({context, event}) => {
      if (event.type !== 'slate operation') {
        return
      }

      const rangeDecorationState: Array<DecoratedRange> = []
      const {splitContext, mergeContext} = context.slateEditor
      const suppressCallback = event.suppressCallback === true

      // Get the original block index if we're in a split context
      const originalBlockIndex = splitContext
        ? context.slateEditor.blockIndexMap.get(splitContext.originalBlockKey)
        : undefined

      // Function to compute the new block index
      // During a split, the new block is inserted right after the original
      const getNewBlockIndex = () => {
        if (!splitContext) return undefined
        // After the split, the new block is at originalBlockIndex + 1
        return originalBlockIndex !== undefined
          ? originalBlockIndex + 1
          : undefined
      }

      // Get block indices from merge context (stored at context creation time,
      // before operations were applied)
      const deletedBlockIndex = mergeContext?.deletedBlockIndex
      const targetBlockIndex = mergeContext?.targetBlockIndex

      for (const decoratedRange of context.slateEditor.decoratedRanges) {
        // Always use the cached Slate Range from decoratedRange instead of
        // re-computing from EditorSelection. This is critical because:
        // 1. toSlateRange looks up blocks by _key, but after merge/remove operations
        //    the block may no longer exist in the blockIndexMap
        // 2. The cached Slate Range uses indices which can be correctly transformed
        //    by Slate's Point.transform for any operation type (split, merge, etc.)
        // 3. For splits, we need original offsets before remove_text clamping
        // 4. For merges, we need the indices before the block is removed
        const slateRange: Range | null = Range.isRange(decoratedRange)
          ? {anchor: decoratedRange.anchor, focus: decoratedRange.focus}
          : null

        if (!Range.isRange(slateRange)) {
          if (!suppressCallback) {
            decoratedRange.rangeDecoration.onMoved?.({
              previousSelection: decoratedRange.rangeDecoration.selection,
              newSelection: null,
              rangeDecoration: decoratedRange.rangeDecoration,
              origin: 'local',
            })
          }
          continue
        }

        let newRange: BaseRange | null | undefined

        // First try merge-aware transformation
        newRange = moveRangeByMergeAwareOperation(
          slateRange,
          event.operation,
          mergeContext,
          deletedBlockIndex,
          targetBlockIndex,
        )

        // If merge-aware returned undefined, try split-aware transformation
        if (newRange === undefined) {
          newRange = moveRangeBySplitAwareOperation(
            slateRange,
            event.operation,
            splitContext,
            originalBlockIndex,
            getNewBlockIndex,
          )
        }

        // Fire onMoved for local ops only. Remote ops batch callbacks
        // into a single 'reconcile decorations' event after the batch.
        if (
          !suppressCallback &&
          ((newRange && newRange !== slateRange) ||
            (newRange === null && slateRange))
        ) {
          const newRangeSelection = newRange
            ? slateRangeToSelection({
                schema: context.schema,
                editor: context.slateEditor,
                range: newRange,
              })
            : null

          decoratedRange.rangeDecoration.onMoved?.({
            previousSelection: decoratedRange.rangeDecoration.selection,
            newSelection: newRangeSelection,
            rangeDecoration: decoratedRange.rangeDecoration,
            origin: 'local',
          })
        }

        // If the newRange is null, it means that the range is not valid anymore and should be removed
        // If it's undefined, it means that the slateRange is still valid and should be kept
        //
        // During remote batches (suppressCallback), DON'T drop decorations on null.
        // Point.transform can return null for intermediate ops even though the final
        // state is valid. Keep the decoration with its last known range — the
        // reconciliation handler will re-resolve it after the batch completes.
        if (newRange !== null) {
          const rangeToUse = newRange || slateRange
          // Only update selection for local ops. During remote batches,
          // preserve the original selection for reconciliation to re-resolve
          // from. Point.transform may produce wrong intermediate results
          // without splitContext/mergeContext (e.g. paste-restructure ops).
          if (!suppressCallback) {
            decoratedRange.rangeDecoration.selection = slateRangeToSelection({
              schema: context.schema,
              editor: context.slateEditor,
              range: rangeToUse,
            })
          }
          rangeDecorationState.push({
            ...rangeToUse,
            rangeDecoration: decoratedRange.rangeDecoration,
          })
        } else if (suppressCallback) {
          // During remote batch: keep the decoration alive with its last known range.
          // Reconciliation will re-resolve from EditorSelection keys after the batch.
          // If the block was deleted (remote merge/split), toSlateRange won't find
          // the key and returns null → onMoved fires with newSelection: null.
          // If the block still exists, toSlateRange resolves correctly.
          // Either way, the stale cached range here is harmless — it's never
          // exposed to the consumer or used for rendering.
          rangeDecorationState.push(decoratedRange)
        }
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },
    'reconcile range decorations': ({context}) => {
      // After a remote batch (+ normalization), re-resolve all decorations
      // from their EditorSelection keys and fire a single onMoved callback
      // per decoration that changed.
      //
      // We re-resolve from keys (not cached ranges) because:
      // 1. Point.transform may have returned null for intermediate ops,
      //    leaving some decorations with stale cached ranges
      // 2. Key-based resolution against the final document state gives
      //    the correct clamped position (Option A: truncate + notify)
      const preRanges = context.slateEditor.preBatchDecorationRanges
      context.slateEditor.preBatchDecorationRanges = new Map()

      const rangeDecorationState: Array<DecoratedRange> = []

      for (const decoratedRange of context.slateEditor.decoratedRanges) {
        const {rangeDecoration} = decoratedRange

        // Use the PRE-BATCH selection for re-resolution, not the current one.
        // During remote batches, we no longer mutate rangeDecoration.selection
        // (Change 1), so it should still be the original. But even if it were
        // mutated by some other path, the pre-batch snapshot is the authoritative
        // source for what the selection was before remote ops arrived.
        const preBatch = preRanges.get(rangeDecoration)
        const previousRange = preBatch?.range ?? null
        const previousSelection = preBatch?.selection ?? null
        const selectionForResolution =
          previousSelection ?? rangeDecoration.selection

        // Re-resolve from EditorSelection keys against current document
        const freshSlateRange = toSlateRange({
          context: {
            schema: context.schema,
            value: context.slateEditor.value,
            selection: selectionForResolution,
          },
          blockIndexMap: context.slateEditor.blockIndexMap,
        })

        if (!Range.isRange(freshSlateRange)) {
          // Decoration can no longer be resolved in the document
          if (previousRange !== null) {
            const consumerSelection = rangeDecoration.onMoved?.({
              previousSelection,
              newSelection: null,
              rangeDecoration,
              origin: 'remote',
            })

            // If the consumer returned an EditorSelection, use it to
            // keep the decoration alive (e.g. re-resolved from W3C annotation)
            if (consumerSelection) {
              const consumerSlateRange = toSlateRange({
                context: {
                  schema: context.schema,
                  value: context.slateEditor.value,
                  selection: consumerSelection,
                },
                blockIndexMap: context.slateEditor.blockIndexMap,
              })

              if (Range.isRange(consumerSlateRange)) {
                rangeDecorationState.push({
                  ...consumerSlateRange,
                  rangeDecoration: {
                    ...rangeDecoration,
                    selection: consumerSelection,
                  },
                })
                continue
              }
            }
          }
          continue
        }

        // Detect if the range changed during the batch.
        // "Changed" means toSlateRange re-resolved to a DIFFERENT position than
        // the pre-batch snapshot — indicating a structural change (split, merge,
        // paste-restructure, block deletion, etc.).
        const changed =
          !previousRange || !Range.equals(previousRange, freshSlateRange)

        if (changed) {
          // Structural change: use toSlateRange's re-resolved position.
          // Point.transform may have produced wrong results without
          // splitContext/mergeContext, so freshSlateRange is authoritative.
          let finalSelection = slateRangeToSelection({
            schema: context.schema,
            editor: context.slateEditor,
            range: freshSlateRange,
          })
          let finalSlateRange = freshSlateRange

          const consumerSelection = rangeDecoration.onMoved?.({
            previousSelection,
            newSelection: finalSelection,
            rangeDecoration,
            origin: 'remote',
          })

          // If the consumer returned an EditorSelection, use it instead
          // of the auto-resolved one (e.g. re-resolved from W3C annotation)
          if (consumerSelection) {
            const consumerSlateRange = toSlateRange({
              context: {
                schema: context.schema,
                value: context.slateEditor.value,
                selection: consumerSelection,
              },
              blockIndexMap: context.slateEditor.blockIndexMap,
            })

            if (Range.isRange(consumerSlateRange)) {
              finalSelection = consumerSelection
              finalSlateRange = consumerSlateRange
            }
          }

          rangeDecorationState.push({
            ...finalSlateRange,
            rangeDecoration: {
              ...rangeDecoration,
              selection: finalSelection,
            },
          })
        } else {
          // No structural change: Point.transform correctly tracked offset
          // shifts during the batch (e.g. text insertions in the same span).
          // toSlateRange re-resolved to the same position as pre-batch because
          // it uses the original offsets literally (just clamped to text.length).
          // Trust Point.transform's cached Slate range — it has the correct
          // shifted offsets. Compute selection from it to keep in sync.
          const cachedSelection = slateRangeToSelection({
            schema: context.schema,
            editor: context.slateEditor,
            range: decoratedRange,
          })
          rangeDecorationState.push({
            ...decoratedRange,
            rangeDecoration: {
              ...rangeDecoration,
              selection: cachedSelection,
            },
          })
        }
      }

      context.slateEditor.decoratedRanges = rangeDecorationState
    },
    'assign readOnly': assign({
      readOnly: ({context, event}) => {
        if (event.type !== 'update read only') {
          return context.readOnly
        }

        return event.readOnly
      },
    }),
    'update decorate': assign({
      decorate: ({context}) => {
        return {
          fn: createDecorate(context.schema, context.slateEditor),
        }
      },
    }),
  },
  actors: {
    'slate operation listener': fromCallback(slateOperationCallback),
  },
  guards: {
    'has pending range decorations': ({context}) =>
      context.pendingRangeDecorations.length > 0,
    'has range decorations': ({context}) =>
      context.slateEditor.decoratedRanges.length > 0,
    'has different decorations': ({context, event}) => {
      if (event.type !== 'range decorations updated') {
        return false
      }

      const existingRangeDecorations = context.slateEditor.decoratedRanges.map(
        (decoratedRange) => ({
          anchor: decoratedRange.rangeDecoration.selection?.anchor,
          focus: decoratedRange.rangeDecoration.selection?.focus,
          payload: decoratedRange.rangeDecoration.payload,
        }),
      )

      const newRangeDecorations = event.rangeDecorations.map(
        (rangeDecoration) => ({
          anchor: rangeDecoration.selection?.anchor,
          focus: rangeDecoration.selection?.focus,
          payload: rangeDecoration.payload,
        }),
      )

      const different = !isDeepEqual(
        existingRangeDecorations,
        newRangeDecorations,
      )

      return different
    },
    'not read only': ({context}) => !context.readOnly,
    'should skip setup': ({context}) => context.skipSetup,
  },
}).createMachine({
  id: 'range decorations',
  context: ({input}) => ({
    readOnly: input.readOnly,
    pendingRangeDecorations: input.rangeDecorations,
    decoratedRanges: [],
    skipSetup: input.skipSetup,
    schema: input.schema,
    slateEditor: input.slateEditor,
    decorate: {
      fn: createDecorate(input.schema, input.slateEditor),
    },
  }),
  invoke: {
    src: 'slate operation listener',
    input: ({context}) => ({slateEditor: context.slateEditor}),
  },
  on: {
    'update read only': {
      actions: ['assign readOnly'],
    },
  },
  initial: 'setting up',
  states: {
    'setting up': {
      always: [
        {
          guard: and(['should skip setup', 'has pending range decorations']),
          target: 'ready',
          actions: ['set up initial range decorations', 'update decorate'],
        },
        {
          guard: 'should skip setup',
          target: 'ready',
        },
      ],
      on: {
        'range decorations updated': {
          actions: ['update pending range decorations'],
        },
        'ready': [
          {
            target: 'ready',
            guard: 'has pending range decorations',
            actions: ['set up initial range decorations', 'update decorate'],
          },
          {
            target: 'ready',
          },
        ],
      },
    },
    'ready': {
      initial: 'idle',
      on: {
        'range decorations updated': {
          target: '.idle',
          guard: 'has different decorations',
          actions: ['update range decorations', 'update decorate'],
        },
      },
      states: {
        'idle': {
          on: {
            'slate operation': {
              target: 'moving range decorations',
              guard: and(['has range decorations', 'not read only']),
            },
            'reconcile decorations': {
              target: 'reconciling range decorations',
              guard: 'has range decorations',
            },
          },
        },
        'moving range decorations': {
          entry: ['move range decorations'],
          always: {
            target: 'idle',
          },
        },
        'reconciling range decorations': {
          entry: ['reconcile range decorations', 'update decorate'],
          always: {
            target: 'idle',
          },
        },
      },
    },
  },
})

function createDecorate(
  schema: EditorSchema,
  slateEditor: PortableTextSlateEditor,
) {
  return function decorate([node, path]: NodeEntry): Array<BaseRange> {
    const defaultStyle = schema.styles.at(0)?.name
    const firstBlock = slateEditor.value[0]
    const editorOnlyContainsEmptyParagraph =
      slateEditor.value.length === 1 &&
      firstBlock &&
      isEmptyTextBlock({schema}, firstBlock) &&
      (!firstBlock.style || firstBlock.style === defaultStyle) &&
      !firstBlock.listItem

    if (editorOnlyContainsEmptyParagraph) {
      return [
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 0],
            offset: 0,
          },
          placeholder: true,
        } as BaseRange,
      ]
    }

    // Editor node has a path length of 0 (should never be decorated)
    if (path.length === 0) {
      return []
    }

    if (!Element.isElement(node) || node.children.length === 0) {
      return []
    }

    const blockIndex = path.at(0)

    if (blockIndex === undefined) {
      return []
    }

    return slateEditor.decoratedRanges.filter((decoratedRange) => {
      // Special case in order to only return one decoration for collapsed ranges
      if (Range.isCollapsed(decoratedRange)) {
        // Collapsed ranges should only be decorated if they are on a block child level (length 2)
        return node.children.some(
          (_, childIndex) =>
            Path.equals(decoratedRange.anchor.path, [blockIndex, childIndex]) &&
            Path.equals(decoratedRange.focus.path, [blockIndex, childIndex]),
        )
      }

      return (
        Range.intersection(decoratedRange, {
          anchor: {path, offset: 0},
          focus: {path, offset: 0},
        }) || Range.includes(decoratedRange, path)
      )
    })
  }
}
