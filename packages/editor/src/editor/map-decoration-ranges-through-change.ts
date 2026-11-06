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

export function mapDecorationRangesThroughChange(
  editorEngine: PortableTextEditorEngine,
  change: Change,
): (range: Range) => Range | null {
  const base = change.entries[0]?.event.beforeValue ?? []
  const patches = changeToPatches(editorEngine, change)
  const steps = interpretTransaction(base, patches)

  return (range) => {
    const mappingRange = normalizeRangeBoundary(base, range, {
      representation: 'next',
      normalizeCollapsed: true,
    })
    const mappedRange = applyDecorationPolicy(
      range,
      mapRange(steps, mappingRange, {collapsedAffinity: 'both'}),
      steps,
      base,
      editorEngine.snapshot.context.value,
    )

    return mappedRange
  }
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
