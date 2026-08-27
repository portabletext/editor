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
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeIntersection} from '../engine/range/range-intersection'
import {transformRange} from '../engine/range/transform-range'
import {isDeepEqual} from '../internal-utils/equality'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {rangeIntersects} from '../traversal/range-intersects'
import type {
  EditorSelection,
  RangeDecoration,
  RangeDecorationEvent,
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
  merge: (leaf: PortableTextSpan, decoration: object) => void
}

/**
 * The `RenderLeaf`-facing per-fragment record: which range decoration
 * wraps this text fragment, and whether the fragment carries the
 * decoration's true start/end point.
 */
export type LeafRangeDecoration = {
  rangeDecoration: RangeDecoration | RegistrableRangeDecoration
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
 * registered id whose decoration died (its range went to `null`), keyed to
 * the range it died under, so a redundant `update()` that hasn't folded in
 * the `{type: 'moved', newRange: null}` event yet can't resurrect it: only
 * a genuinely different range revives it, and so does dropping the id
 * from one `update()` call and re-adding it later, even with the same
 * range, since the drop clears the tombstone. Flattening `decoratedRanges`
 * across sources, prop sources before registered ones, produces
 * `editorEngine.decoratedRanges`.
 */
type RangeDecorationSource = {
  sourceKey: string
  kind: RangeDecorationSourceKind
  rangeDecorations: Array<RangeDecoration | RegistrableRangeDecoration>
  decoratedRanges: Array<DecoratedRange>
  deadSelections: Map<string, EditorSelection>
  initialized: boolean
  /** Only meaningful for a `registered` source; fixed at registration. */
  on?: (event: RangeDecorationEvent) => void
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
    isRangeStart,
    isRangeEnd,
    decorationStart,
    decorationEnd,
  } = decoration as PendingLeafRangeDecoration
  leaf.rangeDecorations = [
    ...(leaf.rangeDecorations ?? []),
    {rangeDecoration, isRangeStart, isRangeEnd, decorationStart, decorationEnd},
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
      merge: mergeRangeDecoration,
      ...rangeDecoration.selection,
    })
  }

  return decoratedRanges
}

/**
 * The two configuration shapes (`selection`/`newSelection` vs.
 * `range`/`newRange`, and only the registered one tombstones by `id`)
 * aren't interchangeable.
 */
function buildDecoratedRangesFromScratch(
  kind: RangeDecorationSourceKind,
  rangeDecorations: Array<RangeDecoration | RegistrableRangeDecoration>,
  deadSelections: Map<string, EditorSelection>,
  on: ((event: RangeDecorationEvent) => void) | undefined,
): Array<DecoratedRange> {
  if (kind === 'registered') {
    return buildRegisteredDecoratedRangesFromScratch(
      rangeDecorations as Array<RegistrableRangeDecoration>,
      deadSelections,
      on,
    )
  }

  return buildPropDecoratedRangesFromScratch(
    rangeDecorations as Array<RangeDecoration>,
  )
}

function buildRegisteredDecoratedRangesFromScratch(
  rangeDecorations: Array<RegistrableRangeDecoration>,
  deadSelections: Map<string, EditorSelection>,
  on: ((event: RangeDecorationEvent) => void) | undefined,
): Array<DecoratedRange> {
  const decoratedRanges: Array<DecoratedRange> = []

  for (const rangeDecoration of rangeDecorations) {
    if (!rangeDecoration.range) {
      on?.({type: 'moved', newRange: null, rangeDecoration, origin: 'local'})
      deadSelections.set(rangeDecoration.id, rangeDecoration.range)
      continue
    }

    decoratedRanges.push({
      rangeDecoration,
      merge: mergeRangeDecoration,
      ...rangeDecoration.range,
    })
  }

  return decoratedRanges
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

/**
 * Reconciles a registered source's decorations by `id`. Unlike the legacy
 * prop source, a registered source always adopts a new `component`
 * reference, since there is no other way for a consumer to swap it for
 * the same `id`. Position is only adopted from the incoming config when
 * the incoming `range` differs from what this `id` was last configured
 * with; otherwise the live (possibly locally-moved) position carries
 * over, so a redundant `update()` call (e.g. a parent re-render) never
 * reverts a decoration that has since moved. An id's tombstone in
 * `deadSelections` only survives while that id keeps appearing in
 * `incoming`; once an `update()` omits it, the tombstone clears, so
 * retired ids don't accumulate and a later re-add starts fresh.
 */
function reconcileRegisteredSource(
  previousRangeDecorations: Array<RegistrableRangeDecoration>,
  previousDecoratedRanges: Array<DecoratedRange>,
  incoming: Array<RegistrableRangeDecoration>,
  deadSelections: Map<string, EditorSelection>,
  on: ((event: RangeDecorationEvent) => void) | undefined,
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
      previousConfig.component === rangeDecoration.component &&
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
        // Still the range this id was last configured with, or the range
        // it died under: either way a redundant `update()` that hasn't
        // folded in the `{type: 'moved', newRange: null}` event, not a
        // deliberate re-anchor. Stays dead, doesn't re-fire `on`.
        continue
      }
      // A range different from both is a deliberate re-anchor: fall
      // through and revive it below.
      deadSelections.delete(rangeDecoration.id)
    }

    if (!rangeDecoration.range) {
      on?.({type: 'moved', newRange: null, rangeDecoration, origin: 'local'})
      deadSelections.set(rangeDecoration.id, rangeDecoration.range)
      continue
    }

    next.push({
      rangeDecoration,
      merge: mergeRangeDecoration,
      ...rangeDecoration.range,
    })
  }

  return next
}

/**
 * Emits the moved/lost event in the shape the decoration's own kind
 * promises: the registration's `on` handler for a registered decoration,
 * the legacy `onMoved` callback for a prop one.
 */
function emitOnMoved(
  kind: RangeDecorationSourceKind,
  rangeDecoration: RangeDecoration | RegistrableRangeDecoration,
  newRange: EditorSelection,
  origin: OperationOrigin,
  on: ((event: RangeDecorationEvent) => void) | undefined,
) {
  const resolvedOrigin = origin === 'remote' ? 'remote' : 'local'

  if (kind === 'registered') {
    const registered = rangeDecoration as RegistrableRangeDecoration
    on?.({
      type: 'moved',
      newRange,
      rangeDecoration: registered,
      origin: resolvedOrigin,
    })
    return
  }

  const prop = rangeDecoration as RangeDecoration
  prop.onMoved?.({
    newSelection: newRange,
    rangeDecoration: prop,
    origin: resolvedOrigin,
  })
}

function moveDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  kind: RangeDecorationSourceKind,
  operation: EngineOperation,
  origin: OperationOrigin,
  snapshotContext: PortableTextEditorEngine['snapshot']['context'],
  deadSelections: Map<string, EditorSelection>,
  on: ((event: RangeDecorationEvent) => void) | undefined,
): Array<DecoratedRange> {
  const next: Array<DecoratedRange> = []

  for (const decoratedRange of decoratedRanges) {
    const currentSelection =
      kind === 'registered'
        ? (decoratedRange.rangeDecoration as RegistrableRangeDecoration).range
        : (decoratedRange.rangeDecoration as RangeDecoration).selection

    if (!currentSelection) {
      emitOnMoved(kind, decoratedRange.rangeDecoration, null, origin, on)
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
      emitOnMoved(kind, decoratedRange.rangeDecoration, newRange, origin, on)
    }

    if (newRange !== null) {
      next.push({
        ...(newRange || currentSelection),
        rangeDecoration:
          kind === 'registered'
            ? {
                ...(decoratedRange.rangeDecoration as RegistrableRangeDecoration),
                range: newRange || currentSelection,
              }
            : {
                ...(decoratedRange.rangeDecoration as RangeDecoration),
                selection: newRange || currentSelection,
              },
        merge: mergeRangeDecoration,
      })
      continue
    }

    if (kind === 'registered') {
      const id = (decoratedRange.rangeDecoration as RegistrableRangeDecoration)
        .id
      deadSelections.set(id, currentSelection)
    }
  }

  return next
}

/**
 * Prop sources render before registered sources, arrival order within each
 * kind (the order `sort`'s stability preserves).
 */
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
          on?: (event: RangeDecorationEvent) => void
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
          source.deadSelections,
          source.on,
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
        const deadSelections = new Map<string, EditorSelection>()
        source = {
          sourceKey: event.sourceKey,
          kind: event.kind,
          rangeDecorations: event.rangeDecorations,
          decoratedRanges: buildDecoratedRangesFromScratch(
            event.kind,
            event.rangeDecorations,
            deadSelections,
            event.on,
          ),
          deadSelections,
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
            source.deadSelections,
            undefined,
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
          source.on,
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

      for (const source of context.sources) {
        source.decoratedRanges = moveDecoratedRanges(
          source.decoratedRanges,
          source.kind,
          event.operation,
          event.origin,
          context.editorEngine.snapshot.context,
          source.deadSelections,
          source.on,
        )
      }

      context.editorEngine.decoratedRanges = flattenSources(context.sources)
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
      // Special case in order to only return one decoration for collapsed ranges
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
