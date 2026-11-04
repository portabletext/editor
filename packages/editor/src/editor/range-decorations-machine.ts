import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextSpan,
} from '@portabletext/schema'
import {
  assign,
  fromCallback,
  setup,
  type ActorRefFrom,
  type AnyEventObject,
  type CallbackLogicFunction,
} from 'xstate'
import {hasRemoteFrame} from '../engine/core/apply-context'
import {
  subscribeToOperationTransactions,
  subscribeToOperations,
  type OperationTransactionEvent,
} from '../engine/core/operation-channel'
import type {Node, NodeEntry} from '../engine/interfaces/node'
import type {EngineOperation} from '../engine/interfaces/operation'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {transformPoint} from '../engine/point/transform-point'
import {cloneRange} from '../engine/range/clone-range'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isForwardRange} from '../engine/range/is-forward-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeIntersection} from '../engine/range/range-intersection'
import {resolveRangeAffinities} from '../engine/range/resolve-range-affinities'
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
  | {
      type: 'engine transaction start'
    }
  | {
      type: 'engine operation'
      operation: EngineOperation
      origin: 'local' | 'remote'
    },
  {editorEngine: PortableTextEditorEngine}
> = ({input, sendBack}) => {
  return subscribeToOperations(
    input.editorEngine,
    (event) => {
      if (input.editorEngine.operationTransactionEvents.length === 0) {
        sendBack({type: 'engine transaction start'})
      }
      if (event.operation.type !== 'set.selection') {
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

const engineTransactionCallback: CallbackLogicFunction<
  AnyEventObject,
  {type: 'engine transaction end'; transaction: OperationTransactionEvent},
  {editorEngine: PortableTextEditorEngine}
> = ({input, sendBack}) =>
  subscribeToOperationTransactions(input.editorEngine, (transaction) => {
    sendBack({type: 'engine transaction end', transaction})
  })

export type DecoratedRange = Range & {
  rangeDecoration: RangeDecoration | Decoration
  kind: RangeDecorationSourceKind
  merge: (leaf: PortableTextSpan, decoration: object) => void
  propIdentity?: object
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
  deadPropSelections: Map<
    object,
    {
      rangeDecoration: RangeDecoration
      origin: 'local' | 'remote'
    }
  >
  /**
   * Decorations (prop identities and registered ids) that collapsed during
   * the current transaction, keyed to the `remove.text` that collapsed them.
   * Transaction correction only revives one when the operation sequence
   * records that removal's text being inserted again.
   */
  collapsedInTransaction: Map<object | string, CollapseProvenance>
  /**
   * Prop identities that operation mapping or correction moved during the
   * current transaction: the decoration as it was when the transaction
   * started, its latest selection and the origin of the latest move.
   * `onMoved` is called once per decoration at transaction end.
   */
  movedProps: Map<
    object,
    {
      rangeDecoration: RangeDecoration
      selection: Range
      origin: 'local' | 'remote'
    }
  >
  movedRegistered: Map<
    string,
    {
      previousRange: Range
      newRange: Range | null
      contentTouched: boolean
    }
  >
  initialized: boolean
  /**
   * Only meaningful for a `registered` source; fixed at registration.
   * Receives this source's net mappings at the end of one transaction.
   */
  on?: (mappings: Array<DecorationMapping>) => void
}

/**
 * `removal` is the `remove.text` that collapsed a decoration, or `undefined`
 * when another operation collapsed it.
 */
type CollapseProvenance = {
  removal: EngineOperation | undefined
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
  previousDecoratedRanges: Array<DecoratedRange> = [],
): Array<DecoratedRange> {
  const decoratedRanges: Array<DecoratedRange> = []

  for (let index = 0; index < rangeDecorations.length; index++) {
    const rangeDecoration = rangeDecorations[index]!
    if (!rangeDecoration.selection) {
      continue
    }

    decoratedRanges.push({
      rangeDecoration,
      kind: 'prop',
      merge: mergeRangeDecoration,
      propIdentity:
        previousDecoratedRanges[index]?.propIdentity ?? rangeDecoration,
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
  previousDecoratedRanges: Array<DecoratedRange> = [],
): Array<DecoratedRange> {
  if (kind === 'registered') {
    return buildRegisteredDecoratedRangesFromScratch(
      rangeDecorations as Array<Decoration>,
    )
  }

  return buildPropDecoratedRangesFromScratch(
    rangeDecorations as Array<RangeDecoration>,
    previousDecoratedRanges,
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
  deadPropSelections: RangeDecorationSource['deadPropSelections'],
  collapsedInTransaction: RangeDecorationSource['collapsedInTransaction'],
  movedProps: RangeDecorationSource['movedProps'],
): Array<DecoratedRange> {
  const next: Array<DecoratedRange> = []

  for (const decoratedRange of decoratedRanges) {
    const rangeDecoration = decoratedRange.rangeDecoration as RangeDecoration
    const currentSelection = rangeDecoration.selection

    if (!currentSelection) {
      continue
    }

    if (isZeroWidthAcrossSpans(snapshotContext.value, currentSelection)) {
      // The endpoints sit on either side of a span boundary at the same
      // block offset, so the range covers no text. Transforming it further
      // lets inserted text push the endpoints apart in reverse order.
      if (decoratedRange.propIdentity) {
        deadPropSelections.set(decoratedRange.propIdentity, {
          rangeDecoration,
          origin,
        })
        collapsedInTransaction.set(decoratedRange.propIdentity, {
          removal: undefined,
        })
      }
      continue
    }

    const newRange = transformRange(
      currentSelection,
      operation,
      snapshotContext,
    )

    if (
      newRange &&
      isCollapsedRange(newRange) &&
      !isCollapsedRange(currentSelection)
    ) {
      if (decoratedRange.propIdentity) {
        deadPropSelections.set(decoratedRange.propIdentity, {
          rangeDecoration,
          origin,
        })
        collapsedInTransaction.set(decoratedRange.propIdentity, {
          removal: getCollapsingRemoval(operation),
        })
      }
      continue
    }

    if (
      newRange &&
      newRange !== currentSelection &&
      decoratedRange.propIdentity
    ) {
      recordPropMove(
        movedProps,
        decoratedRange.propIdentity,
        rangeDecoration,
        newRange,
        origin,
      )
    }

    if (newRange !== null) {
      if (decoratedRange.propIdentity) {
        deadPropSelections.delete(decoratedRange.propIdentity)
      }
      next.push({
        ...newRange,
        rangeDecoration: {...rangeDecoration, selection: newRange},
        kind: 'prop',
        merge: mergeRangeDecoration,
        propIdentity: decoratedRange.propIdentity,
      })
    } else if (decoratedRange.propIdentity) {
      deadPropSelections.set(decoratedRange.propIdentity, {
        rangeDecoration,
        origin,
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

function getBlockKey(path: Range['anchor']['path']): string | undefined {
  const segment = path[0]
  return isKeyedSegment(segment) ? segment._key : undefined
}

function moveRegisteredDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  operation: EngineOperation,
  editorEngine: PortableTextEditorEngine,
  deadSelections: Map<string, EditorSelection>,
  collapsedInTransaction: RangeDecorationSource['collapsedInTransaction'],
  movedRegistered: RangeDecorationSource['movedRegistered'],
): Array<DecoratedRange> {
  const next: Array<DecoratedRange> = []

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
    if (newRange === null || killedByCollapse) {
      recordRegisteredMove(
        movedRegistered,
        liveRangeDecoration.id,
        currentRange,
        null,
        contentTouched,
      )
      deadSelections.set(liveRangeDecoration.id, currentRange)
      if (killedByCollapse) {
        collapsedInTransaction.set(liveRangeDecoration.id, {
          removal: getCollapsingRemoval(operation),
        })
      }
      continue
    }

    const moved = newRange !== currentRange

    if (moved || contentTouched) {
      recordRegisteredMove(
        movedRegistered,
        liveRangeDecoration.id,
        currentRange,
        newRange,
        contentTouched,
      )
    }

    next.push({
      ...newRange,
      rangeDecoration: {...liveRangeDecoration, range: newRange},
      kind: 'registered',
      merge: mergeRangeDecoration,
    })
  }

  return next
}

function recordRegisteredMove(
  movedRegistered: RangeDecorationSource['movedRegistered'],
  id: string,
  previousRange: Range,
  newRange: Range | null,
  contentTouched: boolean,
) {
  const pending = movedRegistered.get(id)
  if (pending) {
    pending.newRange = newRange
    pending.contentTouched ||= contentTouched
    return
  }
  movedRegistered.set(id, {previousRange, newRange, contentTouched})
}

function notifyRegisteredMoves(
  source: RangeDecorationSource,
  origin: 'local' | 'remote',
) {
  if (!source.on || source.movedRegistered.size === 0) {
    source.movedRegistered.clear()
    return
  }
  const mappings: Array<DecorationMapping> = []
  for (const [id, pending] of source.movedRegistered) {
    const unmoved = isDeepEqual(pending.previousRange, pending.newRange)
    if (unmoved && !pending.contentTouched) {
      continue
    }
    const previousRange = cloneRange(pending.previousRange)
    mappings.push({
      id,
      previousRange,
      // An unmoved range keeps the `previousRange` reference, so consumers
      // can tell "content changed in place" from "moved" by identity.
      newRange: unmoved
        ? previousRange
        : pending.newRange
          ? cloneRange(pending.newRange)
          : null,
      contentTouched: pending.contentTouched,
      origin,
    })
  }
  source.movedRegistered.clear()
  if (mappings.length === 0) {
    return
  }
  try {
    source.on(mappings)
  } catch (error) {
    console.error(error)
  }
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

type RemovedEndpoint = {
  path: Point['path']
  spanKey: string
  blockKey: string
  text: string
  offset: number
  allowDifferentKey: boolean
}

type TextSpanNode = {_key: string; _type: string; text: string}

type InsertedCopy = {
  operation: Extract<EngineOperation, {type: 'insert.text' | 'insert'}>
  path: Point['path']
  text: string
  offset: number
  sourceSegment: unknown
  position: 'before' | 'after' | undefined
}

type TransactionCopies = {
  inserted: Array<InsertedCopy>
  blockIndexByKey: Map<string, number>
  afterBlockIndexByKey: Map<string, number>
  mergeTargetByBlockKey: Map<string, string>
  removedBlockKeys: Set<string>
  touchedBlockKeys: Set<string>
  isUpdateValue: boolean
  isLocalSelectionReplacement: boolean
  bypassAmbiguity: boolean
}

type CopyDestination = {
  operation: InsertedCopy['operation']
  point: Point
}

function mapRangeThroughRecordedMoves(
  range: Range,
  transaction: OperationTransactionEvent,
  copies: TransactionCopies,
  schema: EditorSchema,
): Range | null | undefined {
  const [anchorAffinity, focusAffinity] = resolveRangeAffinities(
    range,
    {value: transaction.beforeValue},
    'inward',
  )
  const anchor = mapPointThroughRecordedMoves(
    range.anchor,
    anchorAffinity,
    transaction,
    copies,
    schema,
  )
  const focus = mapPointThroughRecordedMoves(
    range.focus,
    focusAffinity,
    transaction,
    copies,
    schema,
  )
  if (!anchor.moved && !focus.moved) {
    return undefined
  }
  if (!anchor.point || !focus.point) {
    return null
  }
  return {anchor: anchor.point, focus: focus.point}
}

function mapPointThroughRecordedMoves(
  initialPoint: Point,
  affinity: 'forward' | 'backward' | null,
  transaction: OperationTransactionEvent,
  copies: TransactionCopies,
  schema: EditorSchema,
): {point: Point | null; moved: boolean} {
  let point: Point | null = initialPoint
  let removedEndpoint: RemovedEndpoint | undefined
  let moved = false
  const seenInsertions = new Set<InsertedCopy['operation']>()

  for (const operationEvent of transaction.operations) {
    const operation = operationEvent.operation
    if (operation.type === 'insert.text' || operation.type === 'insert') {
      seenInsertions.add(operation)
      if (removedEndpoint) {
        const destination = pickDestination(removedEndpoint, copies, {
          allowedOperations: seenInsertions,
          excludedPath: point?.path,
        })
        if (destination?.operation === operation) {
          point = destination.point
          removedEndpoint = undefined
          moved = true
          continue
        }
      }
    }

    if (point && operation.type === 'remove.text') {
      removedEndpoint = getRemovedEndpoint(point, operation)
      if (removedEndpoint) {
        const destination = pickDestination(removedEndpoint, copies, {
          allowedOperations: seenInsertions,
          excludedPath: point.path,
        })
        if (
          destination &&
          seenInsertions.has(destination.operation) &&
          !isDeepEqual(destination.point.path, point.path)
        ) {
          point = destination.point
          removedEndpoint = undefined
          moved = true
          continue
        }
      }
    }

    if (point && operation.type === 'unset') {
      const relocatedPoint = relocateUnsetPointFromOperations(
        point,
        operationEvent.beforeValue,
        operation,
        copies,
        seenInsertions,
        schema,
      )
      if (relocatedPoint) {
        point = relocatedPoint
        moved = true
        continue
      }
      removedEndpoint ??= getUnsetEndpoint(
        point,
        operationEvent.beforeValue,
        operation,
        schema,
      )
    }

    point = transformPoint(point, operation, {affinity})
  }

  return {
    point:
      point && moved
        ? canonicalizeForwardStart(
            point,
            affinity,
            transaction.afterValue,
            schema,
          )
        : point,
    moved,
  }
}

function buildTransactionCopies(
  transaction: OperationTransactionEvent,
  schema: EditorSchema,
): TransactionCopies {
  const inserted: Array<InsertedCopy> = []
  for (const {operation} of transaction.operations) {
    if (operation.type === 'insert.text') {
      inserted.push({
        operation,
        path: operation.path,
        text: operation.text,
        offset: operation.offset,
        sourceSegment: undefined,
        position: undefined,
      })
      continue
    }
    if (operation.type !== 'insert') {
      continue
    }
    const blockKey = hasTextBlockChildren(operation.node, schema)
      ? operation.node._key
      : getBlockKey(operation.path)
    if (!blockKey) {
      continue
    }
    for (const span of getTextSpans(operation.node, schema)) {
      inserted.push({
        operation,
        path: [{_key: blockKey}, 'children', {_key: span._key}],
        text: span.text,
        offset: 0,
        sourceSegment: operation.path.at(-1),
        position: operation.position,
      })
    }
  }
  const mergeTargetByBlockKey = new Map<string, string>()
  for (let index = 1; index < transaction.beforeValue.length; index++) {
    mergeTargetByBlockKey.set(
      transaction.beforeValue[index]!._key,
      transaction.beforeValue[index - 1]!._key,
    )
  }
  return {
    inserted,
    blockIndexByKey: new Map(
      transaction.beforeValue.map((block, index) => [block._key, index]),
    ),
    afterBlockIndexByKey: new Map(
      transaction.afterValue.map((block, index) => [block._key, index]),
    ),
    mergeTargetByBlockKey,
    removedBlockKeys: new Set(
      transaction.operations.flatMap(({operation}) =>
        operation.type === 'unset' && operation.path.length === 1
          ? [getBlockKey(operation.path) ?? '']
          : [],
      ),
    ),
    touchedBlockKeys: new Set(
      transaction.operations.flatMap(({operation}) => {
        if (operation.type !== 'remove.text' && operation.type !== 'unset') {
          return []
        }
        const blockKey = getBlockKey(operation.path)
        return blockKey ? [blockKey] : []
      }),
    ),
    isUpdateValue: transaction.operations.some((operationEvent) =>
      operationEvent.context.some(
        (frame) => frame.kind === 'remote' && frame.source === 'update-value',
      ),
    ),
    isLocalSelectionReplacement:
      transaction.origin === 'local' &&
      transaction.operations.some(
        (operationEvent) =>
          operationEvent.beforeSelection !== null &&
          !isCollapsedRange(operationEvent.beforeSelection),
      ),
    bypassAmbiguity:
      transaction.origin === 'undo' || transaction.origin === 'redo',
  }
}

function pickDestination(
  removedEndpoint: RemovedEndpoint,
  copies: TransactionCopies,
  options: {
    allowedOperations?: Set<InsertedCopy['operation']>
    excludedPath?: Point['path']
    insertedTextOnly?: boolean
  } = {},
): CopyDestination | undefined {
  if (removedEndpoint.text.length === 0) {
    return undefined
  }
  const candidates = copies.inserted.flatMap((copy) => {
    if (options.insertedTextOnly && copy.operation.type !== 'insert.text') {
      return []
    }
    const destinationBlockKey = getBlockKey(copy.path)
    const mergeTargetKey = copies.mergeTargetByBlockKey.get(
      removedEndpoint.blockKey,
    )
    const eligibleTextInsertion =
      copy.operation.type !== 'insert.text' ||
      destinationBlockKey === removedEndpoint.blockKey ||
      (copies.removedBlockKeys.has(removedEndpoint.blockKey) &&
        destinationBlockKey === mergeTargetKey)
    if (!eligibleTextInsertion) {
      return []
    }
    const destinations: Array<
      CopyDestination & {
        adjacent: boolean
        eligible: boolean
        sameKey: boolean
      }
    > = []
    let textOffset = copy.text.indexOf(removedEndpoint.text)
    while (textOffset !== -1) {
      const spanSegment = copy.path.at(-1)
      const sameKey =
        isKeyedSegment(spanSegment) &&
        spanSegment._key === removedEndpoint.spanKey
      const adjacent = isAdjacentCopy(copy, removedEndpoint, copies)
      const updateValueRekey = isUpdateValueRekey(copy, removedEndpoint, copies)
      destinations.push({
        operation: copy.operation,
        point: {
          path: copy.path,
          offset: copy.offset + textOffset + removedEndpoint.offset,
        },
        adjacent,
        eligible:
          copy.operation.type === 'insert.text' ||
          sameKey ||
          (adjacent && !copies.isLocalSelectionReplacement) ||
          updateValueRekey,
        sameKey,
      })
      textOffset = copy.text.indexOf(
        removedEndpoint.text,
        textOffset + removedEndpoint.text.length,
      )
    }
    return destinations
  })
  const available = candidates.filter(
    (candidate) =>
      candidate.eligible &&
      (!options.allowedOperations ||
        options.allowedOperations.has(candidate.operation)) &&
      (!options.excludedPath ||
        !isDeepEqual(candidate.point.path, options.excludedPath)),
  )
  const freshSpanKeys = new Set(
    candidates.flatMap((candidate) => {
      const spanSegment = candidate.point.path.at(-1)
      return candidate.operation.type === 'insert' &&
        isKeyedSegment(spanSegment)
        ? [spanSegment._key]
        : []
    }),
  )
  if (freshSpanKeys.size > 1) {
    return undefined
  }
  let ordered = available
  const sameKey = available.filter((candidate) => candidate.sameKey)
  if (sameKey.length > 0) {
    ordered = sameKey
  } else {
    const adjacent = available.filter((candidate) => candidate.adjacent)
    if (adjacent.length > 0) {
      ordered = adjacent
    } else if (candidates.length !== 1) {
      return undefined
    }
  }
  if (copies.bypassAmbiguity) {
    return ordered.at(-1)
  }
  return ordered.length === 1 ? ordered[0] : undefined
}

function isAdjacentCopy(
  copy: InsertedCopy,
  removedEndpoint: RemovedEndpoint,
  copies: TransactionCopies,
): boolean {
  if (copy.operation.type !== 'insert' || copy.text !== removedEndpoint.text) {
    return false
  }
  if (!copy.sourceSegment) {
    return false
  }
  if (!isKeyedSegment(copy.sourceSegment)) {
    return false
  }
  if (
    copy.sourceSegment._key === removedEndpoint.spanKey ||
    copy.sourceSegment._key === removedEndpoint.blockKey
  ) {
    return true
  }
  const removedBlockIndex = copies.blockIndexByKey.get(removedEndpoint.blockKey)
  const sourceBlockIndex = copies.blockIndexByKey.get(copy.sourceSegment._key)
  if (removedBlockIndex === undefined || sourceBlockIndex === undefined) {
    return false
  }
  return (
    (copy.position === 'after' && sourceBlockIndex === removedBlockIndex - 1) ||
    (copy.position === 'before' && sourceBlockIndex === removedBlockIndex + 1)
  )
}

function isUpdateValueRekey(
  copy: InsertedCopy,
  removedEndpoint: RemovedEndpoint,
  copies: TransactionCopies,
): boolean {
  if (
    !copies.isUpdateValue ||
    copy.operation.type !== 'insert' ||
    copy.sourceSegment ||
    copy.text !== removedEndpoint.text
  ) {
    return false
  }
  const destinationBlockKey = getBlockKey(copy.path)
  if (!destinationBlockKey) {
    return false
  }
  return (
    copies.blockIndexByKey.get(removedEndpoint.blockKey) ===
    copies.afterBlockIndexByKey.get(destinationBlockKey)
  )
}

function getRemovedEndpoint(
  point: Point,
  operation: Extract<EngineOperation, {type: 'remove.text'}>,
): RemovedEndpoint | undefined {
  if (!isDeepEqual(point.path, operation.path)) {
    return undefined
  }
  const removalEnd = operation.offset + operation.text.length
  const followsRemoval =
    (point.offset > operation.offset && point.offset < removalEnd) ||
    point.offset === operation.offset ||
    point.offset === removalEnd
  const blockSegment = point.path[0]
  const spanSegment = point.path.at(-1)
  if (
    !followsRemoval ||
    !isKeyedSegment(blockSegment) ||
    !isKeyedSegment(spanSegment)
  ) {
    return undefined
  }
  return {
    path: operation.path,
    blockKey: blockSegment._key,
    spanKey: spanSegment._key,
    text: operation.text,
    offset: point.offset - operation.offset,
    allowDifferentKey: false,
  }
}

function canonicalizeForwardStart(
  point: Point,
  affinity: 'forward' | 'backward' | null,
  value: Array<PortableTextBlock>,
  schema: EditorSchema,
): Point {
  const blockSegment = point.path[0]
  const spanSegment = point.path[2]
  if (
    point.offset !== 0 ||
    affinity !== 'forward' ||
    !isKeyedSegment(blockSegment) ||
    !isKeyedSegment(spanSegment)
  ) {
    return point
  }
  const block = value.find((candidate) => candidate._key === blockSegment._key)
  if (!hasTextBlockChildren(block, schema)) {
    return point
  }
  const spanIndex = block.children.findIndex(
    (child) => child._key === spanSegment._key,
  )
  const precedingSpan = block.children[spanIndex - 1]
  return isPortableTextSpan(precedingSpan, schema)
    ? {
        path: [
          {_key: blockSegment._key},
          'children',
          {_key: precedingSpan._key},
        ],
        offset: precedingSpan.text.length,
      }
    : point
}

function relocateUnsetPointFromOperations(
  point: Point,
  beforeValue: Array<PortableTextBlock>,
  operation: Extract<EngineOperation, {type: 'unset'}>,
  copies: TransactionCopies,
  seenInsertions: Set<InsertedCopy['operation']>,
  schema: EditorSchema,
): Point | undefined {
  const pointBlockSegment = point.path[0]
  const pointSpanSegment = point.path[2]
  const unsetSegment = operation.path.at(-1)
  if (
    !isKeyedSegment(pointBlockSegment) ||
    !isKeyedSegment(pointSpanSegment) ||
    !isKeyedSegment(unsetSegment)
  ) {
    return undefined
  }

  if (
    operation.path.length === 1 &&
    unsetSegment._key === pointBlockSegment._key
  ) {
    const removedBlock = beforeValue.find(
      (candidate) => candidate._key === pointBlockSegment._key,
    )
    const removedSpan = findTextSpan(
      removedBlock,
      pointSpanSegment._key,
      schema,
    )
    const candidates = beforeValue.flatMap((block) => {
      if (
        block._key === pointBlockSegment._key ||
        !hasTextBlockChildren(block, schema)
      ) {
        return []
      }
      return block.children.some(
        (child) =>
          isPortableTextSpan(child, schema) &&
          child._key === pointSpanSegment._key &&
          child.text === removedSpan?.text,
      )
        ? [block]
        : []
    })
    if (candidates.length === 1) {
      const candidate = candidates[0]!
      return {
        path: [
          {_key: candidate._key},
          'children',
          {_key: pointSpanSegment._key},
        ],
        offset: point.offset,
      }
    }
    if (!removedSpan) {
      return undefined
    }
    return pickDestination(
      {
        path: point.path,
        blockKey: pointBlockSegment._key,
        spanKey: pointSpanSegment._key,
        text: removedSpan.text,
        offset: point.offset,
        allowDifferentKey: true,
      },
      copies,
      {allowedOperations: seenInsertions, insertedTextOnly: true},
    )?.point
  }

  if (
    operation.path.length !== 3 ||
    unsetSegment._key !== pointSpanSegment._key
  ) {
    return undefined
  }
  const block = beforeValue.find(
    (candidate) => candidate._key === pointBlockSegment._key,
  )
  const span = findTextSpan(block, pointSpanSegment._key, schema)
  if (!span) {
    return undefined
  }
  return pickDestination(
    {
      path: point.path,
      blockKey: pointBlockSegment._key,
      spanKey: pointSpanSegment._key,
      text: span.text,
      offset: point.offset,
      allowDifferentKey: false,
    },
    copies,
    {allowedOperations: seenInsertions, insertedTextOnly: true},
  )?.point
}

function getUnsetEndpoint(
  point: Point,
  beforeValue: Array<PortableTextBlock>,
  operation: Extract<EngineOperation, {type: 'unset'}>,
  schema: EditorSchema,
): RemovedEndpoint | undefined {
  const blockSegment = point.path[0]
  const spanSegment = point.path[2]
  const unsetSegment = operation.path.at(-1)
  if (
    !isKeyedSegment(blockSegment) ||
    !isKeyedSegment(spanSegment) ||
    !isKeyedSegment(unsetSegment) ||
    (operation.path.length === 1 && unsetSegment._key !== blockSegment._key) ||
    (operation.path.length === 3 &&
      (unsetSegment._key !== spanSegment._key ||
        getBlockKey(operation.path) !== blockSegment._key))
  ) {
    return undefined
  }
  const block = beforeValue.find(
    (candidate) => candidate._key === blockSegment._key,
  )
  const span = findTextSpan(block, spanSegment._key, schema)
  return span && span.text.length > 0
    ? {
        path: point.path,
        blockKey: blockSegment._key,
        spanKey: spanSegment._key,
        text: span.text,
        offset: point.offset,
        allowDifferentKey: operation.path.length === 1,
      }
    : undefined
}

function isPortableTextSpan(
  node: unknown,
  schema: EditorSchema,
): node is TextSpanNode {
  return isSpan({schema}, node)
}

function getTextSpans(node: Node, schema: EditorSchema): Array<TextSpanNode> {
  if (isPortableTextSpan(node, schema)) {
    return [node]
  }
  if (!hasTextBlockChildren(node, schema)) {
    return []
  }
  const spans: Array<TextSpanNode> = []
  for (const child of node.children) {
    if (isPortableTextSpan(child, schema)) {
      spans.push(child)
    }
  }
  return spans
}

function findTextSpan(
  block: PortableTextBlock | undefined,
  spanKey: string,
  schema: EditorSchema,
): TextSpanNode | undefined {
  if (!hasTextBlockChildren(block, schema)) {
    return undefined
  }
  for (const child of block.children) {
    if (child._key === spanKey && isPortableTextSpan(child, schema)) {
      return child
    }
  }
  return undefined
}

function hasTextBlockChildren(
  node: unknown,
  schema: EditorSchema,
): node is PortableTextBlock & {children: Array<Node>} {
  return isTextBlock({schema}, node)
}

function correctSourceRanges(
  source: RangeDecorationSource,
  beforeRanges: Array<DecoratedRange>,
  origin: 'local' | 'remote',
  transaction: OperationTransactionEvent,
  copies: TransactionCopies,
  schema: EditorSchema,
): Array<DecoratedRange> {
  const corrected = [...source.decoratedRanges]

  for (let index = 0; index < beforeRanges.length; index++) {
    const beforeDecoratedRange = beforeRanges[index]!
    const beforeRange = getDecoratedRange(beforeDecoratedRange)
    if (
      !copies.touchedBlockKeys.has(
        getBlockKey(beforeRange.anchor.path) ?? '',
      ) &&
      !copies.touchedBlockKeys.has(getBlockKey(beforeRange.focus.path) ?? '')
    ) {
      continue
    }
    const reanchoredRange = mapRangeThroughRecordedMoves(
      beforeRange,
      transaction,
      copies,
      schema,
    )
    if (
      !reanchoredRange ||
      (isCollapsedRange(beforeRange) && !isCollapsedRange(reanchoredRange)) ||
      (!isCollapsedRange(beforeRange) &&
        !isCollapsedRange(reanchoredRange) &&
        isForwardRange(beforeRange, {value: transaction.beforeValue}) !==
          isForwardRange(reanchoredRange, {value: transaction.afterValue}))
    ) {
      continue
    }
    const collapse = source.collapsedInTransaction.get(
      getDecorationIdentity(beforeDecoratedRange),
    )
    if (collapse && !wasRemovedTextReinserted(collapse, copies)) {
      continue
    }
    const currentIndex = findCurrentDecorationIndex(
      source,
      corrected,
      beforeDecoratedRange,
    )
    const currentDecoratedRange = corrected[currentIndex]
    const currentRange = currentDecoratedRange
      ? getDecoratedRange(currentDecoratedRange)
      : null
    if (currentRange && endpointBlockKeysChanged(beforeRange, currentRange)) {
      continue
    }

    const rangeDecoration = beforeDecoratedRange.rangeDecoration
    if (source.kind === 'registered') {
      const decoration = rangeDecoration as Decoration
      const nextDecoratedRange: DecoratedRange = {
        ...reanchoredRange,
        rangeDecoration: {...decoration, range: reanchoredRange},
        kind: 'registered',
        merge: mergeRangeDecoration,
      }
      if (currentDecoratedRange) {
        corrected[currentIndex] = nextDecoratedRange
      } else {
        corrected.splice(index, 0, nextDecoratedRange)
      }
      source.deadSelections.delete(decoration.id)
      recordRegisteredMove(
        source.movedRegistered,
        decoration.id,
        beforeRange,
        reanchoredRange,
        true,
      )
    } else {
      const rangeDecoration =
        beforeDecoratedRange.rangeDecoration as RangeDecoration
      const nextDecoratedRange: DecoratedRange = {
        ...reanchoredRange,
        rangeDecoration: {...rangeDecoration, selection: reanchoredRange},
        kind: 'prop',
        merge: mergeRangeDecoration,
        propIdentity: beforeDecoratedRange.propIdentity,
      }
      if (currentDecoratedRange) {
        corrected[currentIndex] = nextDecoratedRange
      } else {
        corrected.splice(index, 0, nextDecoratedRange)
      }
      if (beforeDecoratedRange.propIdentity) {
        source.deadPropSelections.delete(beforeDecoratedRange.propIdentity)
        recordPropMove(
          source.movedProps,
          beforeDecoratedRange.propIdentity,
          rangeDecoration,
          reanchoredRange,
          origin,
        )
      }
    }
  }

  return corrected
}

/**
 * Corrects every source against the transaction and reports whether any
 * source's decorated ranges changed.
 */
function correctTransaction(
  context: {
    sources: Array<RangeDecorationSource>
    schema: EditorSchema
  },
  transaction: OperationTransactionEvent,
  beforeRangesBySource: Map<string, Array<DecoratedRange>>,
): boolean {
  const origin = transaction.origin === 'remote' ? 'remote' : 'local'
  const copies = buildTransactionCopies(transaction, context.schema)
  const previousDecoratedRanges = context.sources.map(
    (source) => source.decoratedRanges,
  )
  for (const source of context.sources) {
    const beforeRanges = beforeRangesBySource.get(source.sourceKey) ?? []
    source.decoratedRanges = correctSourceRanges(
      source,
      beforeRanges,
      origin,
      transaction,
      copies,
      context.schema,
    )
    killCollapsedPropRanges(source, beforeRanges, transaction, origin)
  }
  return context.sources.some(
    (source, index) =>
      source.deadPropSelections.size > 0 ||
      !areSameDecoratedRanges(
        source.decoratedRanges,
        previousDecoratedRanges[index],
      ),
  )
}

/**
 * Kills prop decorations that were not collapsed before the transaction
 * but are now: either collapsed, or zero-width across a span boundary,
 * which the last operation can leave behind without a later operation
 * noticing.
 */
function killCollapsedPropRanges(
  source: RangeDecorationSource,
  beforeRanges: Array<DecoratedRange>,
  transaction: OperationTransactionEvent,
  origin: 'local' | 'remote',
) {
  if (source.kind !== 'prop') {
    return
  }
  const beforeRangesByIdentity = new Map(
    beforeRanges.map((beforeRange) => [beforeRange.propIdentity, beforeRange]),
  )
  source.decoratedRanges = source.decoratedRanges.filter((decoratedRange) => {
    if (!decoratedRange.propIdentity) {
      return true
    }
    const beforeDecoratedRange = beforeRangesByIdentity.get(
      decoratedRange.propIdentity,
    )
    if (!beforeDecoratedRange) {
      return true
    }
    const beforeRange = getDecoratedRange(beforeDecoratedRange)
    if (
      isCollapsedRange(beforeRange) ||
      isZeroWidthAcrossSpans(transaction.beforeValue, beforeRange)
    ) {
      return true
    }
    const range = getDecoratedRange(decoratedRange)
    if (
      !isCollapsedRange(range) &&
      !isZeroWidthAcrossSpans(transaction.afterValue, range)
    ) {
      return true
    }
    source.deadPropSelections.set(decoratedRange.propIdentity, {
      rangeDecoration: decoratedRange.rangeDecoration as RangeDecoration,
      origin,
    })
    return false
  })
}

/**
 * Calls `onMoved` once per prop decoration that the transaction killed or
 * moved: deaths first, then each moved decoration whose final selection
 * differs from its selection when the transaction started.
 */
function notifyPropMoves(source: RangeDecorationSource) {
  for (const {rangeDecoration, origin} of source.deadPropSelections.values()) {
    rangeDecoration.onMoved?.({
      newSelection: null,
      rangeDecoration,
      origin,
    })
  }
  for (const [propIdentity, moved] of source.movedProps) {
    const {rangeDecoration, selection, origin} = moved
    if (
      source.deadPropSelections.has(propIdentity) ||
      (rangeDecoration.selection &&
        hasSameAnchorAndFocus(rangeDecoration.selection, selection))
    ) {
      continue
    }
    rangeDecoration.onMoved?.({
      newSelection: selection,
      rangeDecoration,
      origin,
    })
  }
  source.deadPropSelections.clear()
  source.movedProps.clear()
}

/**
 * Keeps the decoration from the first move in a transaction, which is the
 * one the consumer holds, and the selection and origin of the latest move.
 */
function recordPropMove(
  movedProps: RangeDecorationSource['movedProps'],
  propIdentity: object,
  rangeDecoration: RangeDecoration,
  selection: Range,
  origin: 'local' | 'remote',
) {
  movedProps.set(propIdentity, {
    rangeDecoration:
      movedProps.get(propIdentity)?.rangeDecoration ?? rangeDecoration,
    selection,
    origin,
  })
}

/**
 * Whether `range`'s endpoints sit on either side of a span boundary at the
 * same block offset, covering no text. Endpoints in different blocks or in
 * the same span are decided from their paths without reading the document.
 */
function isZeroWidthAcrossSpans(
  blocks: Array<PortableTextBlock>,
  range: Range,
): boolean {
  const anchorBlockKey = getBlockKey(range.anchor.path)
  const anchorSpanSegment = range.anchor.path[2]
  const focusSpanSegment = range.focus.path[2]
  if (
    range.anchor.path.length !== 3 ||
    range.focus.path.length !== 3 ||
    anchorBlockKey === undefined ||
    anchorBlockKey !== getBlockKey(range.focus.path) ||
    !isKeyedSegment(anchorSpanSegment) ||
    !isKeyedSegment(focusSpanSegment) ||
    anchorSpanSegment._key === focusSpanSegment._key
  ) {
    return false
  }
  const block = blocks.find((candidate) => candidate._key === anchorBlockKey)
  if (!block || !Array.isArray(block.children)) {
    return false
  }
  let offset = 0
  let anchorOffset: number | undefined
  let focusOffset: number | undefined
  for (const child of block.children) {
    if (child._key === anchorSpanSegment._key) {
      anchorOffset = offset + range.anchor.offset
    }
    if (child._key === focusSpanSegment._key) {
      focusOffset = offset + range.focus.offset
    }
    offset +=
      'text' in child && typeof child.text === 'string' ? child.text.length : 0
  }
  return anchorOffset !== undefined && anchorOffset === focusOffset
}

function getCollapsingRemoval(
  operation: EngineOperation,
): EngineOperation | undefined {
  return operation.type === 'remove.text' ? operation : undefined
}

function wasRemovedTextReinserted(
  collapse: CollapseProvenance,
  copies: TransactionCopies,
): boolean {
  const removal = collapse.removal
  if (!removal || removal.type !== 'remove.text' || removal.text.length === 0) {
    return false
  }
  const blockSegment = removal.path[0]
  const spanSegment = removal.path.at(-1)
  if (!isKeyedSegment(blockSegment) || !isKeyedSegment(spanSegment)) {
    return false
  }
  const removedEndpoint: RemovedEndpoint = {
    path: removal.path,
    blockKey: blockSegment._key,
    spanKey: spanSegment._key,
    text: removal.text,
    offset: 0,
    allowDifferentKey: false,
  }
  return pickDestination(removedEndpoint, copies) !== undefined
}

function areSameDecoratedRanges(
  decoratedRanges: Array<DecoratedRange>,
  previousDecoratedRanges: Array<DecoratedRange> | undefined,
): boolean {
  return (
    decoratedRanges === previousDecoratedRanges ||
    (previousDecoratedRanges !== undefined &&
      decoratedRanges.length === previousDecoratedRanges.length &&
      decoratedRanges.every(
        (decoratedRange, index) =>
          decoratedRange === previousDecoratedRanges[index],
      ))
  )
}

function getDecorationIdentity(
  decoratedRange: DecoratedRange,
): object | string {
  return decoratedRange.kind === 'registered'
    ? (decoratedRange.rangeDecoration as Decoration).id
    : (decoratedRange.propIdentity ?? decoratedRange.rangeDecoration)
}

function getDecoratedRange(decoratedRange: DecoratedRange): Range {
  return decoratedRange.kind === 'registered'
    ? (decoratedRange.rangeDecoration as Decoration).range
    : (decoratedRange.rangeDecoration as RangeDecoration).selection!
}

function findCurrentDecorationIndex(
  source: RangeDecorationSource,
  decoratedRanges: Array<DecoratedRange>,
  beforeDecoratedRange: DecoratedRange,
): number {
  if (source.kind === 'prop') {
    return decoratedRanges.findIndex(
      (decoratedRange) =>
        decoratedRange.propIdentity === beforeDecoratedRange.propIdentity,
    )
  }
  const id = (beforeDecoratedRange.rangeDecoration as Decoration).id
  return decoratedRanges.findIndex(
    (decoratedRange) =>
      (decoratedRange.rangeDecoration as Decoration).id === id,
  )
}

function endpointBlockKeysChanged(
  currentRange: Range,
  nextRange: Range,
): boolean {
  return (
    getBlockKey(currentRange.anchor.path) !==
      getBlockKey(nextRange.anchor.path) ||
    getBlockKey(currentRange.focus.path) !== getBlockKey(nextRange.focus.path)
  )
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
      transactionSources: Map<string, Array<DecoratedRange>>
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
          type: 'engine transaction start'
        }
      | {
          type: 'engine operation'
          operation: EngineOperation
          origin: 'local' | 'remote'
        }
      | {
          type: 'engine transaction end'
          transaction: OperationTransactionEvent
        }
      | {
          type: 'update read only'
          readOnly: boolean
        },
  },
  actions: {
    'capture transaction sources': ({context}) => {
      // Moves replace `decoratedRanges` and their ranges instead of
      // mutating them, so the arrays themselves are the snapshot.
      context.transactionSources = new Map(
        context.sources.map((source) => [
          source.sourceKey,
          source.decoratedRanges,
        ]),
      )
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
        deadPropSelections: new Map(),
        collapsedInTransaction: new Map(),
        movedProps: new Map(),
        movedRegistered: new Map(),
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
          deadPropSelections: new Map(),
          collapsedInTransaction: new Map(),
          movedProps: new Map(),
          movedRegistered: new Map(),
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
          const previousDecoratedRanges = source.decoratedRanges
          source.rangeDecorations = event.rangeDecorations
          source.decoratedRanges = buildDecoratedRangesFromScratch(
            source.kind,
            event.rangeDecorations,
            previousDecoratedRanges,
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

      for (const source of context.sources) {
        if (source.kind === 'registered') {
          source.decoratedRanges = moveRegisteredDecoratedRanges(
            source.decoratedRanges,
            event.operation,
            context.editorEngine,
            source.deadSelections,
            source.collapsedInTransaction,
            source.movedRegistered,
          )
        } else if (!context.readOnly) {
          source.decoratedRanges = movePropDecoratedRanges(
            source.decoratedRanges,
            event.operation,
            event.origin,
            context.editorEngine.snapshot.context,
            source.deadPropSelections,
            source.collapsedInTransaction,
            source.movedProps,
          )
        }
      }

      context.editorEngine.decoratedRanges = flattenSources(context.sources)
    },
    'correct range decorations': ({context, event}) => {
      if (event.type !== 'engine transaction end') {
        return
      }
      let changed = false
      const beforeRangesBySource = context.transactionSources
      context.transactionSources = new Map()
      if (
        !event.transaction.operations.every(
          ({operation}) =>
            operation.type === 'insert.text' ||
            operation.type === 'set.selection',
        ) ||
        context.sources.some(
          (source) =>
            source.deadPropSelections.size > 0 ||
            source.collapsedInTransaction.size > 0,
        )
      ) {
        // Inserting text can neither collapse a range nor move text between
        // blocks, so per-operation mapping is final for such a transaction.
        changed = correctTransaction(
          context,
          event.transaction,
          beforeRangesBySource,
        )
      }
      for (const source of context.sources) {
        source.collapsedInTransaction.clear()
      }
      // `decorate.fn` is kept: correction and deaths only change ranges in
      // blocks the transaction modified, and those re-render anyway.
      if (changed) {
        context.editorEngine.decoratedRanges = flattenSources(context.sources)
      }
      for (const source of context.sources) {
        notifyPropMoves(source)
        notifyRegisteredMoves(
          source,
          event.transaction.origin === 'remote' ? 'remote' : 'local',
        )
      }
    },
  },
  actors: {
    'engine operation listener': fromCallback(engineOperationCallback),
    'engine transaction listener': fromCallback(engineTransactionCallback),
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
    transactionSources: new Map(),
  }),
  invoke: [
    {
      src: 'engine operation listener',
      input: ({context}) => ({editorEngine: context.editorEngine}),
    },
    {
      src: 'engine transaction listener',
      input: ({context}) => ({editorEngine: context.editorEngine}),
    },
  ],
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
        'engine transaction start': {
          actions: ['capture transaction sources'],
        },
        'engine transaction end': {
          actions: ['correct range decorations'],
        },
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
