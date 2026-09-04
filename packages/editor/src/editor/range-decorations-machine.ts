import {isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import {
  and,
  assign,
  fromCallback,
  setup,
  type ActorRefFrom,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {
  subscribeToOperations,
  type OperationOrigin,
} from '../engine/core/operation-channel'
import type {Node, NodeEntry} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Range} from '../engine/interfaces/range'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeIntersection} from '../engine/range/range-intersection'
import {transformRange} from '../engine/range/transform-range'
import {isDeepEqual} from '../internal-utils/equality'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {rangeIntersects} from '../traversal/range-intersects'
import type {
  EditorSelection,
  RangeDecoration,
  RangeDecorationMapping,
  RegistrableRangeDecoration,
} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isEmptyTextBlock} from '../utils'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {EditorSchema} from './editor-schema'

const engineOperationCallback: CallbackLogicFunction<
  AnyEventObject,
  {
    type: 'engine operation'
    operation: EngineOperation
    origin: OperationOrigin
  },
  {editorEngine: PortableTextEditorEngine}
> = ({input, sendBack}) => {
  return subscribeToOperations(
    input.editorEngine,
    (event) => {
      if (event.operation.type !== 'set.selection') {
        // `transform range decorations` reads the editor snapshot
        // synchronously and needs the pre-apply tree (removed nodes must
        // still be present to resolve document order) — hence the
        // `before` phase.
        sendBack({
          type: 'engine operation',
          operation: event.operation,
          origin: event.origin,
        })
      }
    },
    {phase: 'before'},
  )
}

export type DecoratedRange = Range & {
  rangeDecoration: RangeDecoration | RegistrableRangeDecoration
  kind: RangeDecorationSourceKind
  merge: (leaf: PortableTextSpan, decoration: object) => void
}

export type LeafRangeDecoration =
  | {
      kind: 'prop'
      rangeDecoration: RangeDecoration
      isFirst: boolean
      isLast: boolean
    }
  | {
      kind: 'registered'
      rangeDecoration: RegistrableRangeDecoration
      isFirst: boolean
      isLast: boolean
    }

type RangeDecorationSourceKind = 'prop' | 'registered'

/**
 * One registration's worth of range decorations. `rangeDecorations` is the
 * raw config last supplied by the source (the `PortableTextEditable` prop,
 * or a `registerRangeDecorations` call); `decoratedRanges` is the live,
 * positionally up-to-date state (moved by local/remote edits, reconciled
 * by `id` for registered sources). `deadSelections` tombstones a
 * registered id whose decoration died (an edit destroyed the content it
 * was anchored to), keyed to the range it died under, so a redundant
 * `update()` that hasn't folded in the `lost` event yet can't resurrect
 * it: only a genuinely different range revives it, and so does dropping
 * the id from one `update()` call and re-adding it later, even with the
 * same range, since the drop clears the tombstone. Flattening
 * `decoratedRanges` across sources, prop sources before registered ones,
 * produces `editorEngine.decoratedRanges`.
 */
type RangeDecorationSource = {
  sourceKey: string
  kind: RangeDecorationSourceKind
  rangeDecorations: Array<RangeDecoration | RegistrableRangeDecoration>
  decoratedRanges: Array<DecoratedRange>
  deadSelections: Map<string, EditorSelection>
  initialized: boolean
  /**
   * Only meaningful for a `registered` source; fixed at registration.
   * Receives this source's mappings for one engine operation, one entry
   * per affected decoration, in this source's array order.
   */
  on?: (mappings: Array<RangeDecorationMapping>) => void
}

/**
 * The per-fragment record `mergeRangeDecoration` accumulates before the
 * final `isFirst`/`isLast` pass. `decorationStart`/`decorationEnd` are the
 * decoration's clipped offsets local to the span being merged into;
 * `isRangeStart`/`isRangeEnd` say whether that span is where the
 * decoration's true (document-wide) start/end point lands. A fragment is
 * only ever the decoration's first (or last) rendered piece when both the
 * span-level and the offset-level condition hold.
 */
type PendingLeafRangeDecoration = {
  rangeDecoration: RangeDecoration | RegistrableRangeDecoration
  kind: RangeDecorationSourceKind
  isRangeStart: boolean
  isRangeEnd: boolean
  decorationStart: number
  decorationEnd: number
}

function mergeRangeDecoration(
  leaf: PortableTextSpan & {
    rangeDecorations?: Array<PendingLeafRangeDecoration>
  },
  decoration: object,
) {
  const {
    rangeDecoration,
    kind,
    isRangeStart,
    isRangeEnd,
    decorationStart,
    decorationEnd,
  } = decoration as PendingLeafRangeDecoration
  leaf.rangeDecorations = [
    ...(leaf.rangeDecorations ?? []),
    {
      rangeDecoration,
      kind,
      isRangeStart,
      isRangeEnd,
      decorationStart,
      decorationEnd,
    },
  ]
}

function buildPropDecoratedRangesFromScratch(
  rangeDecorations: Array<RangeDecoration>,
): Array<DecoratedRange> {
  const decoratedRanges: Array<DecoratedRange> = []

  for (const rangeDecoration of rangeDecorations) {
    if (!rangeDecoration.selection) {
      rangeDecoration.onMoved?.({
        newSelection: null,
        rangeDecoration,
        origin: 'local',
      })
      continue
    }

    decoratedRanges.push({
      rangeDecoration,
      kind: 'prop',
      merge: mergeRangeDecoration,
      ...rangeDecoration.selection,
    })
  }

  return decoratedRanges
}

function buildRegisteredDecoratedRangesFromScratch(
  rangeDecorations: Array<RegistrableRangeDecoration>,
): Array<DecoratedRange> {
  return rangeDecorations.map((rangeDecoration) => ({
    rangeDecoration,
    kind: 'registered',
    merge: mergeRangeDecoration,
    ...rangeDecoration.range,
  }))
}

/**
 * The two configuration shapes (`selection` vs. `range`, and only the
 * registered one tombstones by `id`) aren't interchangeable.
 */
function buildDecoratedRangesFromScratch(
  kind: RangeDecorationSourceKind,
  rangeDecorations: Array<RangeDecoration | RegistrableRangeDecoration>,
): Array<DecoratedRange> {
  if (kind === 'registered') {
    return buildRegisteredDecoratedRangesFromScratch(
      rangeDecorations as Array<RegistrableRangeDecoration>,
    )
  }

  return buildPropDecoratedRangesFromScratch(
    rangeDecorations as Array<RangeDecoration>,
  )
}

/**
 * The legacy `PortableTextEditable` prop's equality guard: a decoration is
 * only rebuilt when its anchor, focus, or payload actually changed. This
 * keeps the `rangeDecoration` object (and its `component`/`onMoved`
 * references) stable across renders that resupply the same configuration,
 * which downstream leaf memoization relies on to skip re-rendering.
 */
function hasDifferentDecorations(
  previous: Array<DecoratedRange>,
  next: Array<RangeDecoration>,
): boolean {
  const existingRangeDecorations = previous.map((decoratedRange) => {
    const rangeDecoration = decoratedRange.rangeDecoration as RangeDecoration
    return {
      anchor: rangeDecoration.selection?.anchor,
      focus: rangeDecoration.selection?.focus,
      payload: rangeDecoration.payload,
    }
  })

  const newRangeDecorations = next.map((rangeDecoration) => ({
    anchor: rangeDecoration.selection?.anchor,
    focus: rangeDecoration.selection?.focus,
    payload: rangeDecoration.payload,
  }))

  return !isDeepEqual(existingRangeDecorations, newRangeDecorations)
}

function reconcileRegisteredSource(
  previousRangeDecorations: Array<RegistrableRangeDecoration>,
  previousDecoratedRanges: Array<DecoratedRange>,
  incoming: Array<RegistrableRangeDecoration>,
  deadSelections: Map<string, EditorSelection>,
): Array<DecoratedRange> {
  const incomingIds = new Set(
    incoming.map((rangeDecoration) => rangeDecoration.id),
  )
  for (const id of deadSelections.keys()) {
    if (!incomingIds.has(id)) {
      deadSelections.delete(id)
    }
  }

  const previousConfigById = new Map(
    previousRangeDecorations.map((rangeDecoration) => [
      rangeDecoration.id,
      rangeDecoration,
    ]),
  )
  const previousLiveById = new Map(
    previousDecoratedRanges.map((decoratedRange) => [
      (decoratedRange.rangeDecoration as RegistrableRangeDecoration).id,
      decoratedRange,
    ]),
  )

  const next: Array<DecoratedRange> = []

  for (const rangeDecoration of incoming) {
    const previousConfig = previousConfigById.get(rangeDecoration.id)
    const previousLive = previousLiveById.get(rangeDecoration.id)

    const fullyUnchanged =
      previousConfig !== undefined &&
      previousLive !== undefined &&
      previousConfig.render === rangeDecoration.render &&
      isDeepEqual(previousConfig.range, rangeDecoration.range)

    if (fullyUnchanged && previousLive) {
      next.push(previousLive)
      continue
    }

    const rangeUnchanged =
      previousConfig !== undefined &&
      isDeepEqual(previousConfig.range, rangeDecoration.range)

    if (rangeUnchanged && previousLive) {
      next.push({
        anchor: previousLive.anchor,
        focus: previousLive.focus,
        rangeDecoration: {
          ...rangeDecoration,
          range: (previousLive.rangeDecoration as RegistrableRangeDecoration)
            .range,
        },
        kind: 'registered',
        merge: mergeRangeDecoration,
      })
      continue
    }

    if (deadSelections.has(rangeDecoration.id)) {
      if (
        rangeUnchanged ||
        isDeepEqual(
          deadSelections.get(rangeDecoration.id),
          rangeDecoration.range,
        )
      ) {
        continue
      }
      deadSelections.delete(rangeDecoration.id)
    }

    next.push({
      rangeDecoration,
      kind: 'registered',
      merge: mergeRangeDecoration,
      ...rangeDecoration.range,
    })
  }

  return next
}

function movePropDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  operation: EngineOperation,
  origin: OperationOrigin,
  snapshotContext: PortableTextEditorEngine['snapshot']['context'],
): Array<DecoratedRange> {
  const resolvedOrigin = origin === 'remote' ? 'remote' : 'local'
  const next: Array<DecoratedRange> = []

  for (const decoratedRange of decoratedRanges) {
    const rangeDecoration = decoratedRange.rangeDecoration as RangeDecoration
    const currentSelection = rangeDecoration.selection

    if (!currentSelection) {
      rangeDecoration.onMoved?.({
        newSelection: null,
        rangeDecoration,
        origin: resolvedOrigin,
      })
      continue
    }

    const newRange = transformRange(
      currentSelection,
      operation,
      snapshotContext,
    )

    if (
      (newRange && newRange !== currentSelection) ||
      (newRange === null && currentSelection)
    ) {
      rangeDecoration.onMoved?.({
        newSelection: newRange,
        rangeDecoration,
        origin: resolvedOrigin,
      })
    }

    if (newRange !== null) {
      next.push({
        ...newRange,
        rangeDecoration: {...rangeDecoration, selection: newRange},
        kind: 'prop',
        merge: mergeRangeDecoration,
      })
    }
  }

  return next
}

/**
 * Whether `operation` changed content the decoration's current `range`
 * covers: a `set`/`unset`/`insert` touching a node inside it, or an
 * `insert.text`/`remove.text` whose touched span overlaps the range's
 * content, from `operation.offset` to `operation.offset + text.length`
 * (empty for `insert.text`, since inserting doesn't remove anything).
 * An `insert.text` exactly at the range's own start/end offset falls
 * outside it: the same edge `transformRange`'s affinity pushes the
 * boundary away from, pure insertion doesn't touch existing content. A
 * `remove.text` overlaps as soon as its touched span reaches into the
 * range, even starting at or before the range's own start offset: the
 * range's content sat inside the removed span. A collapsed range covers
 * no content at all, so it never touches, regardless of operation type.
 */
function operationTouchesRange(
  operation: EngineOperation,
  range: NonNullable<EditorSelection>,
  editorEngine: PortableTextEditorEngine,
): boolean {
  if (isCollapsedRange(range)) {
    return false
  }

  switch (operation.type) {
    case 'insert.text':
    case 'remove.text': {
      const root = {value: editorEngine.snapshot.context.value}
      const [start, end] = rangeEdges(range, root)
      const target = {path: operation.path, offset: operation.offset}
      const touchedEnd =
        operation.type === 'remove.text'
          ? {
              path: operation.path,
              offset: operation.offset + operation.text.length,
            }
          : target
      return (
        isAfterPoint(touchedEnd, start, root) &&
        isBeforePoint(target, end, root)
      )
    }
    case 'set':
    case 'unset':
    case 'insert':
      return rangeIntersects(editorEngine.snapshot, range, operation.path)
    default:
      return false
  }
}

function moveRegisteredDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  operation: EngineOperation,
  origin: OperationOrigin,
  editorEngine: PortableTextEditorEngine,
  deadSelections: Map<string, EditorSelection>,
): {
  decoratedRanges: Array<DecoratedRange>
  mappings: Array<RangeDecorationMapping>
} {
  const resolvedOrigin = origin === 'remote' ? 'remote' : 'local'
  const next: Array<DecoratedRange> = []
  const mappings: Array<RangeDecorationMapping> = []

  for (const decoratedRange of decoratedRanges) {
    const liveRangeDecoration =
      decoratedRange.rangeDecoration as RegistrableRangeDecoration
    const currentRange = liveRangeDecoration.range

    const newRange = transformRange(
      currentRange,
      operation,
      editorEngine.snapshot.context,
    )

    // A range born collapsed (a presence caret) stays alive through
    // edits that leave it collapsed; only a range that WAS expanded and
    // this operation collapses counts as destroyed.
    const killedByCollapse =
      newRange !== null &&
      isCollapsedRange(newRange) &&
      !isCollapsedRange(currentRange)

    if (newRange === null || killedByCollapse) {
      mappings.push({
        id: liveRangeDecoration.id,
        previousRange: currentRange,
        newRange: null,
        contentTouched: false,
        origin: resolvedOrigin,
      })
      deadSelections.set(liveRangeDecoration.id, currentRange)
      continue
    }

    const moved = newRange !== currentRange
    const contentTouched = operationTouchesRange(
      operation,
      currentRange,
      editorEngine,
    )

    if (moved || contentTouched) {
      mappings.push({
        id: liveRangeDecoration.id,
        previousRange: currentRange,
        newRange,
        contentTouched,
        origin: resolvedOrigin,
      })
    }

    next.push({
      ...newRange,
      rangeDecoration: {...liveRangeDecoration, range: newRange},
      kind: 'registered',
      merge: mergeRangeDecoration,
    })
  }

  return {decoratedRanges: next, mappings}
}

function flattenSources(
  sources: Array<RangeDecorationSource>,
): Array<DecoratedRange> {
  const kindOrder: Record<RangeDecorationSourceKind, number> = {
    prop: 0,
    registered: 1,
  }

  return [...sources]
    .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind])
    .flatMap((source) => source.decoratedRanges)
}

export const rangeDecorationsMachine = setup({
  types: {
    context: {} as {
      sources: Array<RangeDecorationSource>
      readOnly: boolean
      schema: EditorSchema
      editorEngine: PortableTextEditorEngine
      decorate: {fn: (nodeEntry: NodeEntry) => Array<Range>}
      /**
       * Set by `process source update`, read by `update decorate if
       * source changed`. `assign()` is what makes xstate hand out a new
       * snapshot object, which `useSelector` needs to see a new
       * `decorate.fn`: a plain mutation of `context.decorate` leaves the
       * snapshot object `===` the previous one, so
       * `useSyncExternalStoreWithSelector` never re-runs the selector.
       * Threading the verdict through this field lets the actual
       * `decorate.fn` reassignment go through a conditional `assign()`.
       */
      sourceUpdateChanged: boolean
    },
    input: {} as {
      readOnly: boolean
      schema: EditorSchema
      editorEngine: PortableTextEditorEngine
    },
    events: {} as
      | {
          type: 'ready'
        }
      | {
          type: 'source updated'
          sourceKey: string
          kind: RangeDecorationSourceKind
          rangeDecorations: Array<RangeDecoration | RegistrableRangeDecoration>
          /**
           * Only read when this `sourceKey` is seen for the first time:
           * fixed at registration, an `update()` call never carries one.
           */
          on?: (mappings: Array<RangeDecorationMapping>) => void
        }
      | {
          type: 'source removed'
          sourceKey: string
        }
      | {
          type: 'engine operation'
          operation: EngineOperation
          origin: OperationOrigin
        }
      | {
          type: 'update read only'
          readOnly: boolean
        },
  },
  actions: {
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
          fn: createDecorate(context.schema, context.editorEngine),
        }
      },
    }),
    'update decorate if source changed': assign(({context}) => {
      if (!context.sourceUpdateChanged) {
        return {}
      }

      return {
        decorate: {fn: createDecorate(context.schema, context.editorEngine)},
      }
    }),
    'queue source': ({context, event}) => {
      if (event.type !== 'source updated') {
        return
      }

      const existing = context.sources.find(
        (source) => source.sourceKey === event.sourceKey,
      )

      if (existing) {
        existing.rangeDecorations = event.rangeDecorations
        return
      }

      context.sources.push({
        sourceKey: event.sourceKey,
        kind: event.kind,
        rangeDecorations: event.rangeDecorations,
        decoratedRanges: [],
        deadSelections: new Map(),
        initialized: false,
        on: event.on,
      })
    },
    'remove queued source': ({context, event}) => {
      if (event.type !== 'source removed') {
        return
      }

      context.sources = context.sources.filter(
        (source) => source.sourceKey !== event.sourceKey,
      )
    },
    'set up sources': ({context}) => {
      for (const source of context.sources) {
        if (source.initialized) {
          continue
        }

        source.decoratedRanges = buildDecoratedRangesFromScratch(
          source.kind,
          source.rangeDecorations,
        )
        source.initialized = true
      }

      context.editorEngine.decoratedRanges = flattenSources(context.sources)
    },
    /**
     * Reconciles one source's update and, only when that source's rendered
     * output actually changed, reassigns `decorate.fn` too. A fresh
     * function reference is what makes `useDecorateContext` re-run the
     * per-node decorate pass on every subscribed node (see
     * `use-decorations.ts`); skipping it for a payload-equal resupply (the
     * prop's `hasDifferentDecorations` guard, or a registered `update()`
     * that reconciles to fully-unchanged) keeps that resupply free.
     */
    'process source update': ({context, event}) => {
      if (event.type !== 'source updated') {
        return
      }

      let source = context.sources.find(
        (candidate) => candidate.sourceKey === event.sourceKey,
      )

      let changed = true

      if (!source) {
        source = {
          sourceKey: event.sourceKey,
          kind: event.kind,
          rangeDecorations: event.rangeDecorations,
          decoratedRanges: buildDecoratedRangesFromScratch(
            event.kind,
            event.rangeDecorations,
          ),
          deadSelections: new Map(),
          initialized: true,
          on: event.on,
        }
        context.sources.push(source)
      } else if (source.kind === 'prop') {
        changed = hasDifferentDecorations(
          source.decoratedRanges,
          event.rangeDecorations as Array<RangeDecoration>,
        )

        if (changed) {
          source.rangeDecorations = event.rangeDecorations
          source.decoratedRanges = buildDecoratedRangesFromScratch(
            source.kind,
            event.rangeDecorations,
          )
        }
      } else {
        const previousRangeDecorations =
          source.rangeDecorations as Array<RegistrableRangeDecoration>
        const previousDecoratedRanges = source.decoratedRanges

        const nextDecoratedRanges = reconcileRegisteredSource(
          previousRangeDecorations,
          previousDecoratedRanges,
          event.rangeDecorations as Array<RegistrableRangeDecoration>,
          source.deadSelections,
        )

        changed =
          nextDecoratedRanges.length !== previousDecoratedRanges.length ||
          nextDecoratedRanges.some(
            (decoratedRange, index) =>
              decoratedRange !== previousDecoratedRanges[index],
          )

        source.rangeDecorations = event.rangeDecorations
        source.decoratedRanges = nextDecoratedRanges
      }

      context.sourceUpdateChanged = changed

      if (!changed) {
        return
      }

      context.editorEngine.decoratedRanges = flattenSources(context.sources)
    },
    'process source removal': ({context, event}) => {
      if (event.type !== 'source removed') {
        return
      }

      const removedSource = context.sources.find(
        (source) => source.sourceKey === event.sourceKey,
      )

      context.sources = context.sources.filter(
        (source) => source.sourceKey !== event.sourceKey,
      )
      context.editorEngine.decoratedRanges = flattenSources(context.sources)
      context.sourceUpdateChanged = Boolean(
        removedSource && removedSource.decoratedRanges.length > 0,
      )
    },
    'move range decorations': ({context, event}) => {
      if (event.type !== 'engine operation') {
        return
      }

      const pendingNotifications: Array<{
        on: (mappings: Array<RangeDecorationMapping>) => void
        mappings: Array<RangeDecorationMapping>
      }> = []

      for (const source of context.sources) {
        if (source.kind === 'registered') {
          const result = moveRegisteredDecoratedRanges(
            source.decoratedRanges,
            event.operation,
            event.origin,
            context.editorEngine,
            source.deadSelections,
          )
          source.decoratedRanges = result.decoratedRanges
          if (source.on && result.mappings.length > 0) {
            pendingNotifications.push({
              on: source.on,
              mappings: result.mappings,
            })
          }
        } else {
          source.decoratedRanges = movePropDecoratedRanges(
            source.decoratedRanges,
            event.operation,
            event.origin,
            context.editorEngine.snapshot.context,
          )
        }
      }

      // Mappings deliver after every source's `decoratedRanges` (and the
      // flattened `editorEngine.decoratedRanges`) already reflect this
      // operation, so `getDecorations()` called from inside `onMapped`
      // reads this operation's result, never the pre-operation state.
      context.editorEngine.decoratedRanges = flattenSources(context.sources)

      for (const notification of pendingNotifications) {
        try {
          notification.on(notification.mappings)
        } catch (error) {
          // A consumer throw must not propagate into the machine's action:
          // xstate would stop the actor and every layer would silently stop
          // tracking for the rest of the session.
          console.error(error)
        }
      }
    },
  },
  actors: {
    'engine operation listener': fromCallback(engineOperationCallback),
  },
  guards: {
    'has range decorations': ({context}) =>
      context.editorEngine.decoratedRanges.length > 0,
    'not read only': ({context}) => !context.readOnly,
  },
}).createMachine({
  id: 'range decorations',
  context: ({input}) => ({
    readOnly: input.readOnly,
    sources: [],
    schema: input.schema,
    editorEngine: input.editorEngine,
    decorate: {
      fn: createDecorate(input.schema, input.editorEngine),
    },
    sourceUpdateChanged: false,
  }),
  invoke: {
    src: 'engine operation listener',
    input: ({context}) => ({editorEngine: context.editorEngine}),
  },
  on: {
    'update read only': {
      actions: ['assign readOnly'],
    },
  },
  initial: 'setting up',
  states: {
    'setting up': {
      on: {
        'source updated': {
          actions: ['queue source'],
        },
        'source removed': {
          actions: ['remove queued source'],
        },
        'ready': {
          target: 'ready',
          actions: ['set up sources', 'update decorate'],
        },
      },
    },
    'ready': {
      initial: 'idle',
      on: {
        'source updated': {
          target: '.idle',
          actions: [
            'process source update',
            'update decorate if source changed',
          ],
        },
        'source removed': {
          target: '.idle',
          actions: [
            'process source removal',
            'update decorate if source changed',
          ],
        },
      },
      states: {
        'idle': {
          on: {
            'engine operation': {
              target: 'moving range decorations',
              guard: and(['has range decorations', 'not read only']),
            },
          },
        },
        'moving range decorations': {
          entry: ['move range decorations'],
          always: {
            target: 'idle',
          },
        },
      },
    },
  },
})

export type RangeDecorationsActor = ActorRefFrom<typeof rangeDecorationsMachine>

function createDecorate(
  schema: EditorSchema,
  editorEngine: PortableTextEditorEngine,
) {
  return function decorate([node, path]: NodeEntry): Array<Range> {
    const defaultStyle = schema.styles.at(0)?.name
    const firstBlock = editorEngine.snapshot.context.value[0]
    const editorOnlyContainsEmptyParagraph =
      editorEngine.snapshot.context.value.length === 1 &&
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
        } as Range,
      ]
    }

    // Editor node has a path length of 0 (should never be decorated)
    if (path.length === 0) {
      return []
    }

    if (
      !isTextBlock({schema: editorEngine.snapshot.context.schema}, node) ||
      node.children.length === 0
    ) {
      return []
    }

    return editorEngine.decoratedRanges.filter((decoratedRange) => {
      // Special case so a collapsed range gets only one decoration
      if (isCollapsedRange(decoratedRange)) {
        // Collapsed ranges should only be decorated if they are on a block child level.
        const anchorBlock = getEnclosingBlock(
          editorEngine.snapshot,
          decoratedRange.anchor.path,
        )
        const anchorChildSegment = decoratedRange.anchor.path.at(-1)

        if (!anchorBlock || !isKeyedSegment(anchorChildSegment)) {
          return false
        }

        return (
          anchorBlock.node._key === node._key &&
          node.children.some(
            (child: Node) => child._key === anchorChildSegment._key,
          )
        )
      }

      return (
        rangeIntersection(
          decoratedRange,
          {
            anchor: {path, offset: 0},
            focus: {path, offset: 0},
          },
          editorEngine.snapshot.context,
        ) || rangeIntersects(editorEngine.snapshot, decoratedRange, path)
      )
    })
  }
}
