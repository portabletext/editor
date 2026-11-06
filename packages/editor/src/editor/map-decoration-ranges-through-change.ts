import type {Patch} from '@portabletext/patches'
import {
  interpretTransaction,
  mapRange,
  normalizeRangeBoundary,
  rangeSurvives,
  type Step,
} from '@portabletext/steps'
import type {Change} from '../engine/core/change'
import type {Range} from '../engine/interfaces/range'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {operationToPatches} from '../internal-utils/operation-to-patches'
import type {PortableTextEditorEngine} from '../types/editor-engine'

export type DecorationMappingDebugCapture = {
  cause: Change['cause']['type']
  entryOrigins: Array<Change['entries'][number]['event']['origin']>
  beforeValue: Change['entries'][number]['event']['beforeValue']
  entryPatches: Array<Array<Patch>>
  derivedPatches: Array<Patch>
  steps: ReturnType<typeof interpretTransaction>
  range: Range
  mappedRange: Range | null
}

let decorationMappingDebugHook:
  | ((capture: DecorationMappingDebugCapture) => void)
  | undefined

export function setDecorationMappingDebugHook(
  hook: ((capture: DecorationMappingDebugCapture) => void) | undefined,
): void {
  decorationMappingDebugHook = hook
}

export function mapDecorationRangesThroughChange(
  editorEngine: PortableTextEditorEngine,
  change: Change,
): (range: Range) => Range | null {
  const base = change.entries[0]?.event.beforeValue ?? []
  const patches = changeToPatches(editorEngine, change)
  const steps = interpretTransaction(base, patches)
  const touchedBlocks = getTouchedBlocks(base, steps)

  return (range) => {
    const mappedRange = rangeTouchesBlocks(range, touchedBlocks)
      ? applyDecorationPolicy(
          range,
          mapDecorationRange(base, steps, range),
          steps,
          base,
          editorEngine.snapshot.context.value,
        )
      : range

    decorationMappingDebugHook?.({
      cause: change.cause.type,
      entryOrigins: change.entries.map((entry) => entry.event.origin),
      beforeValue: base,
      entryPatches: change.entries.map((entry) => entry.patches),
      derivedPatches: patches,
      steps,
      range,
      mappedRange,
    })

    return mappedRange
  }
}

type TouchedBlocks =
  | {
      keys: ReadonlySet<string>
      baseIndexes: ReadonlySet<number>
      baseIndexByKey: ReadonlyMap<string, number>
    }
  | 'all'

function getTouchedBlocks(
  base: Change['entries'][number]['event']['beforeValue'],
  steps: ReadonlyArray<Step>,
): TouchedBlocks {
  const blockKeys = new Set<string>()

  for (const step of steps) {
    if (step.type === 'move.text') {
      if (
        !addBlockKey(blockKeys, step.from.path) ||
        !addBlockKey(blockKeys, step.to.path)
      ) {
        return 'all'
      }
    } else if (step.type === 'move.node') {
      if (
        !addBlockKey(blockKeys, step.from) ||
        !addBlockKey(blockKeys, step.to)
      ) {
        return 'all'
      }
    } else {
      if (!addBlockKey(blockKeys, step.path)) {
        return 'all'
      }
      if (step.type === 'set.key' && step.path.length === 1) {
        blockKeys.add(step.newKey)
      }
    }
  }

  const baseIndexByKey = new Map(
    base.map((block, index) => [block._key, index] as const),
  )
  return {
    keys: blockKeys,
    baseIndexByKey,
    baseIndexes: new Set(
      [...blockKeys].flatMap((key) => {
        const index = baseIndexByKey.get(key)
        return index === undefined ? [] : [index]
      }),
    ),
  }
}

function rangeTouchesBlocks(
  range: Range,
  touchedBlocks: TouchedBlocks,
): boolean {
  if (touchedBlocks === 'all') {
    return true
  }

  if (
    pointTouchesBlock(range.anchor, touchedBlocks.keys) ||
    pointTouchesBlock(range.focus, touchedBlocks.keys)
  ) {
    return true
  }

  const anchorIndex = pointBlockIndex(range.anchor, touchedBlocks)
  const focusIndex = pointBlockIndex(range.focus, touchedBlocks)
  if (anchorIndex === undefined || focusIndex === undefined) {
    return true
  }

  const startIndex = Math.min(anchorIndex, focusIndex)
  const endIndex = Math.max(anchorIndex, focusIndex)
  return [...touchedBlocks.baseIndexes].some(
    (index) => index >= startIndex && index <= endIndex,
  )
}

function pointBlockIndex(
  point: Range['anchor'],
  touchedBlocks: Exclude<TouchedBlocks, 'all'>,
): number | undefined {
  const blockSegment = point.path[0]
  if (typeof blockSegment !== 'object' || !('_key' in blockSegment)) {
    return undefined
  }

  return touchedBlocks.baseIndexByKey.get(blockSegment._key)
}

function pointTouchesBlock(
  point: Range['anchor'],
  touchedBlockKeys: ReadonlySet<string>,
): boolean {
  const blockSegment = point.path[0]
  return (
    typeof blockSegment !== 'object' ||
    !('_key' in blockSegment) ||
    touchedBlockKeys.has(blockSegment._key)
  )
}

function addBlockKey(
  blockKeys: Set<string>,
  path: ReadonlyArray<string | {_key: string}>,
): boolean {
  const blockSegment = path[0]
  if (typeof blockSegment === 'object' && '_key' in blockSegment) {
    blockKeys.add(blockSegment._key)
    return true
  }

  return false
}

function mapDecorationRange(
  base: Change['entries'][number]['event']['beforeValue'],
  steps: ReadonlyArray<Step>,
  range: Range,
): Range | null {
  const isBackward = isAfterPoint(range.anchor, range.focus, {value: base})
  const rangeInDocumentOrder = isBackward
    ? {anchor: range.focus, focus: range.anchor}
    : range
  const mappedRange = mapRange(
    steps,
    normalizeRangeBoundary(base, rangeInDocumentOrder, {
      representation: 'next',
      normalizeCollapsed: true,
    }),
    {collapsedAffinity: 'both'},
  )

  return mappedRange === null || !isBackward
    ? mappedRange
    : {anchor: mappedRange.focus, focus: mappedRange.anchor}
}

function applyDecorationPolicy(
  range: Range,
  mappedRange: Range | null,
  steps: ReadonlyArray<Step>,
  beforeValue: Change['entries'][number]['event']['beforeValue'],
  afterValue: PortableTextEditorEngine['snapshot']['context']['value'],
): Range | null {
  if (steps.length === 0) {
    return mappedRange
  }

  if (mappedRange === null || isCollapsedRange(range)) {
    return mappedRange === null
      ? null
      : normalizeRangeBoundary(afterValue, mappedRange, {
          normalizeCollapsed: true,
        })
  }

  if (
    isCollapsedRange(mappedRange) ||
    rangeDirectionChanged(range, mappedRange, beforeValue, afterValue) ||
    !rangeSurvives(beforeValue, steps, range)
  ) {
    return null
  }

  return normalizeRangeBoundary(afterValue, mappedRange, {
    normalizeCollapsed: true,
  })
}

function rangeDirectionChanged(
  range: Range,
  mappedRange: Range,
  beforeValue: Change['entries'][number]['event']['beforeValue'],
  afterValue: PortableTextEditorEngine['snapshot']['context']['value'],
): boolean {
  return (
    isAfterPoint(range.anchor, range.focus, {value: beforeValue}) !==
    isAfterPoint(mappedRange.anchor, mappedRange.focus, {value: afterValue})
  )
}

export function changeToPatches(
  editorEngine: PortableTextEditorEngine,
  change: Change,
): Array<Patch> {
  const patches: Array<Patch> = []

  for (let index = 0; index < change.entries.length; index++) {
    const entry = change.entries[index]!
    const afterValue =
      change.entries[index + 1]?.event.beforeValue ??
      editorEngine.snapshot.context.value
    const blockIndexMap = new Map<string, number>()
    buildIndexMaps(
      {
        schema: editorEngine.snapshot.context.schema,
        containers: editorEngine.snapshot.context.containers,
        value: afterValue,
      },
      {blockIndexMap},
    )
    patches.push(
      ...operationToPatches(entry.event.operation, {
        beforeValue: entry.event.beforeValue,
        afterSnapshot: {
          context: {
            schema: editorEngine.snapshot.context.schema,
            containers: editorEngine.snapshot.context.containers,
            value: afterValue,
          },
          blockIndexMap,
        },
      }),
    )
  }

  return patches
}
