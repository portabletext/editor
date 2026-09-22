import {isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import {
  assign,
  fromCallback,
  setup,
  type ActorRefFrom,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {hasRemoteFrame} from '../engine/core/apply-context'
import {subscribeToOperations} from '../engine/core/operation-channel'
import type {Node, NodeEntry} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Range} from '../engine/interfaces/range'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {cloneRange} from '../engine/range/clone-range'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeIntersection} from '../engine/range/range-intersection'
import {transformRange} from '../engine/range/transform-range'
import {isDeepEqual} from '../internal-utils/equality'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {rangeIntersects} from '../traversal/range-intersects'
import type {
  Decoration,
  DecorationMapping,
  EditorSelection,
  RangeDecoration,
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
    origin: 'local' | 'remote'
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
          origin: hasRemoteFrame(event.context) ? 'remote' : 'local',
        })
      }
    },
    {phase: 'before'},
  )
}

export type DecoratedRange = Range & {
  rangeDecoration: RangeDecoration | Decoration
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
      rangeDecoration: Decoration
      isFirst: boolean
      isLast: boolean
    }

type RangeDecorationSourceKind = 'prop' | 'registered'

/**
 * One source's decorations. `rangeDecorations` is the raw config last
 * supplied by the source (the `PortableTextEditable` prop, or a
 * `registerDecorations` call). `decoratedRanges` is the live,
 * positionally up-to-date state, moved by local/remote edits and
 * reconciled by `id` for registered sources. `deadSelections` tombstones
 * a registered id whose decoration died, keyed to the range it died
 * under. `initialized` marks whether `decoratedRanges` has been built
 * from `rangeDecorations` yet.
 */
type RangeDecorationSource = {
  sourceKey: string
  kind: RangeDecorationSourceKind
  rangeDecorations: Array<RangeDecoration | Decoration>
  decoratedRanges: Array<DecoratedRange>
  deadSelections: Map<string, EditorSelection>
  initialized: boolean
  /**
   * Only meaningful for a `registered` source; fixed at registration.
   * Receives this source's mappings for one engine operation, one entry
   * per affected decoration, in this source's array order.
   */
  on?: (mappings: Array<DecorationMapping>) => void
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
  rangeDecoration: RangeDecoration | Decoration
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
  rangeDecorations: Array<Decoration>,
): Array<DecoratedRange> {
  return rangeDecorations.map((rangeDecoration) => {
    const range = cloneRange(rangeDecoration.range)
    return {
      rangeDecoration: {...rangeDecoration, range},
      kind: 'registered',
      merge: mergeRangeDecoration,
      ...range,
    }
  })
}

/**
 * The two configuration shapes (`selection` vs. `range`, and only the
 * registered one tombstones by `id`) aren't interchangeable.
 */
function buildDecoratedRangesFromScratch(
  kind: RangeDecorationSourceKind,
  rangeDecorations: Array<RangeDecoration | Decoration>,
): Array<DecoratedRange> {
  if (kind === 'registered') {
    return buildRegisteredDecoratedRangesFromScratch(
      rangeDecorations as Array<Decoration>,
    )
  }

  return buildPropDecoratedRangesFromScratch(
    rangeDecorations as Array<RangeDecoration>,
  )
}

/**
 * The registered-source config mirror (`source.rangeDecorations`, read back
 * as `previousConfig` by `reconcileRegisteredSource`) must not alias the
 * consumer's own range objects: `isDeepEqual` short-circuits on reference
 * identity, so a consumer that mutates a range in place and calls `update()`
 * with that same object would otherwise see the mutation silently ignored.
 */
function cloneRegisteredConfig(
  rangeDecorations: Array<Decoration>,
): Array<Decoration> {
  return rangeDecorations.map((rangeDecoration) => ({
    ...rangeDecoration,
    range: cloneRange(rangeDecoration.range),
  }))
}

/**
 * The `PortableTextEditable` prop's equality guard: a decoration is
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
  previousRangeDecorations: Array<Decoration>,
  previousDecoratedRanges: Array<DecoratedRange>,
  incoming: Array<Decoration>,
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
      (decoratedRange.rangeDecoration as Decoration).id,
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
      hasSameAnchorAndFocus(previousConfig.range, rangeDecoration.range)

    if (fullyUnchanged && previousLive) {
      next.push(previousLive)
      continue
    }

    const rangeUnchanged =
      previousConfig !== undefined &&
      hasSameAnchorAndFocus(previousConfig.range, rangeDecoration.range)

    if (rangeUnchanged && previousLive) {
      next.push({
        anchor: previousLive.anchor,
        focus: previousLive.focus,
        rangeDecoration: {
          ...rangeDecoration,
          range: (previousLive.rangeDecoration as Decoration).range,
        },
        kind: 'registered',
        merge: mergeRangeDecoration,
      })
      continue
    }

    if (deadSelections.has(rangeDecoration.id)) {
      const deadRange = deadSelections.get(rangeDecoration.id)
      if (
        rangeUnchanged ||
        (deadRange && hasSameAnchorAndFocus(deadRange, rangeDecoration.range))
      ) {
        continue
      }
      deadSelections.delete(rangeDecoration.id)
    }

    const range = cloneRange(rangeDecoration.range)

    next.push({
      rangeDecoration: {...rangeDecoration, range},
      kind: 'registered',
      merge: mergeRangeDecoration,
      ...range,
    })
  }

  return next
}

/**
 * A range can carry extra own keys (`backward`, from a captured editor
 * selection) that a live, edit-adjusted range never does: `transformRange`
 * always returns a plain `{anchor, focus}`. Comparing whole objects would
 * treat that extra key as a deliberate re-anchor, snapping a moved
 * decoration back to its config position or reviving a tombstoned one onto
 * destroyed content.
 */
function hasSameAnchorAndFocus(
  a: NonNullable<EditorSelection>,
  b: NonNullable<EditorSelection>,
): boolean {
  return isDeepEqual(a.anchor, b.anchor) && isDeepEqual(a.focus, b.focus)
}

function movePropDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  operation: EngineOperation,
  origin: 'local' | 'remote',
  snapshotContext: PortableTextEditorEngine['snapshot']['context'],
): Array<DecoratedRange> {
  const next: Array<DecoratedRange> = []

  for (const decoratedRange of decoratedRanges) {
    const rangeDecoration = decoratedRange.rangeDecoration as RangeDecoration
    const currentSelection = rangeDecoration.selection

    if (!currentSelection) {
      rangeDecoration.onMoved?.({
        newSelection: null,
        rangeDecoration,
        origin,
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
        origin,
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
 * A `set`/`unset`/`insert` touches `range` when it targets a node inside
 * it. `insert.text`/`remove.text` touch when the affected span overlaps
 * `range`'s content: an insertion exactly at `range`'s own start/end
 * offset doesn't touch it (matching `transformRange`'s affinity), but a
 * removal reaching into `range` from either side does. A collapsed
 * `range` never touches, regardless of operation type.
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
  origin: 'local' | 'remote',
  editorEngine: PortableTextEditorEngine,
  deadSelections: Map<string, EditorSelection>,
): {
  decoratedRanges: Array<DecoratedRange>
  mappings: Array<DecorationMapping>
} {
  const next: Array<DecoratedRange> = []
  const mappings: Array<DecorationMapping> = []

  for (const decoratedRange of decoratedRanges) {
    const liveRangeDecoration = decoratedRange.rangeDecoration as Decoration
    const currentRange = liveRangeDecoration.range

    const newRange = transformRange(
      currentRange,
      operation,
      editorEngine.snapshot.context,
    )

    const killedByCollapse =
      newRange !== null &&
      isCollapsedRange(newRange) &&
      !isCollapsedRange(currentRange)

    const contentTouched = operationTouchesRange(
      operation,
      currentRange,
      editorEngine,
    )
    const clonedCurrentRange = cloneRange(currentRange)

    if (newRange === null || killedByCollapse) {
      mappings.push({
        id: liveRangeDecoration.id,
        previousRange: clonedCurrentRange,
        newRange: null,
        contentTouched,
        origin,
      })
      deadSelections.set(liveRangeDecoration.id, currentRange)
      continue
    }

    const moved = newRange !== currentRange

    if (moved || contentTouched) {
      mappings.push({
        id: liveRangeDecoration.id,
        previousRange: clonedCurrentRange,
        newRange: moved ? cloneRange(newRange) : clonedCurrentRange,
        contentTouched,
        origin,
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
          rangeDecorations: Array<RangeDecoration | Decoration>
          /**
           * Only read when this `sourceKey` is seen for the first time:
           * fixed at registration, an `update()` call never carries one.
           */
          on?: (mappings: Array<DecorationMapping>) => void
        }
      | {
          type: 'source removed'
          sourceKey: string
        }
      | {
          type: 'engine operation'
          operation: EngineOperation
          origin: 'local' | 'remote'
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

      const rangeDecorations =
        event.kind === 'registered'
          ? cloneRegisteredConfig(event.rangeDecorations as Array<Decoration>)
          : event.rangeDecorations

      if (existing) {
        existing.rangeDecorations = rangeDecorations
        return
      }

      context.sources.push({
        sourceKey: event.sourceKey,
        kind: event.kind,
        rangeDecorations,
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
          rangeDecorations:
            event.kind === 'registered'
              ? cloneRegisteredConfig(
                  event.rangeDecorations as Array<Decoration>,
                )
              : event.rangeDecorations,
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
          source.rangeDecorations as Array<Decoration>
        const previousDecoratedRanges = source.decoratedRanges

        const nextDecoratedRanges = reconcileRegisteredSource(
          previousRangeDecorations,
          previousDecoratedRanges,
          event.rangeDecorations as Array<Decoration>,
          source.deadSelections,
        )

        changed =
          nextDecoratedRanges.length !== previousDecoratedRanges.length ||
          nextDecoratedRanges.some(
            (decoratedRange, index) =>
              decoratedRange !== previousDecoratedRanges[index],
          )

        source.rangeDecorations = cloneRegisteredConfig(
          event.rangeDecorations as Array<Decoration>,
        )
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
        on: (mappings: Array<DecorationMapping>) => void
        mappings: Array<DecorationMapping>
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
        } else if (!context.readOnly) {
          source.decoratedRanges = movePropDecoratedRanges(
            source.decoratedRanges,
            event.operation,
            event.origin,
            context.editorEngine.snapshot.context,
          )
        }
      }

      context.editorEngine.decoratedRanges = flattenSources(context.sources)

      for (const notification of pendingNotifications) {
        try {
          notification.on(notification.mappings)
        } catch (error) {
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
