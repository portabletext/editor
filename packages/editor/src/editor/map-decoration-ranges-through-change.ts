import type {Patch} from '@portabletext/patches'
import {
  interpretTransaction,
  mapRange,
  normalizeRangeBoundary,
  type Step,
} from '@portabletext/steps'
import type {Change} from '../engine/core/change'
import type {Range} from '../engine/interfaces/range'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {isDeepEqual} from '../internal-utils/equality'
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

  return (range) => {
    const mappingRange = normalizeRangeBoundary(base, range, {
      representation: 'next',
    })
    const mappedRange = applyDecorationPolicy(
      range,
      mapRange(steps, mappingRange),
      change,
      steps,
      base,
      editorEngine.snapshot.context.value,
    )

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

function applyDecorationPolicy(
  range: Range,
  mappedRange: Range | null,
  change: Change,
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
      : normalizeRangeBoundary(afterValue, mappedRange)
  }

  if (
    isCollapsedRange(mappedRange) ||
    rangeDirectionChanged(range, mappedRange, beforeValue, afterValue) ||
    (originalSingleSpanTextWasFullyRemoved(range, change) &&
      !stepsMoveOriginalText(range, steps))
  ) {
    return null
  }

  return normalizeRangeBoundary(afterValue, mappedRange)
}

function stepsMoveOriginalText(
  range: Range,
  steps: ReadonlyArray<Step>,
): boolean {
  const start = Math.min(range.anchor.offset, range.focus.offset)
  const end = Math.max(range.anchor.offset, range.focus.offset)

  return steps.some((step) => {
    if (step.type === 'move.node') {
      return isDeepEqual(
        range.anchor.path.slice(0, step.from.length),
        step.from,
      )
    }

    return (
      step.type === 'move.text' &&
      isDeepEqual(step.from.path, range.anchor.path) &&
      step.from.offset < end &&
      step.from.offset + step.from.length > start
    )
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

function originalSingleSpanTextWasFullyRemoved(
  range: Range,
  change: Change,
): boolean {
  if (!isDeepEqual(range.anchor.path, range.focus.path)) {
    return false
  }

  const start = Math.min(range.anchor.offset, range.focus.offset)
  const end = Math.max(range.anchor.offset, range.focus.offset)
  const removedIntervals = change.entries.flatMap((entry) => {
    const operation = entry.event.operation
    if (
      operation.type !== 'remove.text' ||
      !isDeepEqual(operation.path, range.anchor.path)
    ) {
      return []
    }

    return [
      {
        start: operation.offset,
        end: operation.offset + operation.text.length,
      },
    ]
  })

  let coveredUntil = start
  for (const interval of removedIntervals.sort((a, b) => a.start - b.start)) {
    if (interval.end <= coveredUntil) {
      continue
    }
    if (interval.start > coveredUntil) {
      return false
    }
    coveredUntil = interval.end
    if (coveredUntil >= end) {
      return true
    }
  }

  return false
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
