import type {Patch} from '@portabletext/patches'
import {
  interpretTransaction,
  mapRange,
  mapRangeInward,
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
): {mapRange: (range: Range) => Range | null; movesNode: boolean} {
  const base = change.entries[0]?.event.beforeValue ?? []
  const patches = changeToPatches(editorEngine, change)
  const steps = interpretTransaction(base, patches)
  const touchedBlocks = getTouchedBlocks(base, steps)

  return {
    mapRange: (range) =>
      rangeTouchesBlocks(range, touchedBlocks)
        ? applyDecorationPolicy(
            range,
            mapDecorationRange(
              base,
              steps,
              range,
              editorEngine.snapshot.context.schema.block.name,
            ),
            steps,
            base,
            editorEngine.snapshot.context.value,
          )
        : range,
    movesNode: steps.some((step) => step.type === 'move.node'),
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
  for (const index of touchedBlocks.baseIndexes) {
    if (index >= startIndex && index <= endIndex) {
      return true
    }
  }

  return false
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
  textBlockType: string,
): Range | null {
  const isBackward = isAfterPoint(range.anchor, range.focus, {value: base})
  const rangeInDocumentOrder = isBackward
    ? {anchor: range.focus, focus: range.anchor}
    : range
  const normalizedRange = normalizeRangeBoundary(base, rangeInDocumentOrder, {
    representation: 'next',
    normalizeCollapsed: true,
  })
  const mappedRange = mapRange(steps, normalizedRange, {
    collapsedAffinity: 'both',
  })
  const recoveredRange =
    mappedRange === null &&
    !isCollapsedRange(normalizedRange) &&
    removesTextContainer(base, steps, textBlockType)
      ? mapRangeInward(base, steps, normalizedRange)
      : mappedRange

  return recoveredRange === null || !isBackward
    ? recoveredRange
    : {anchor: recoveredRange.focus, focus: recoveredRange.anchor}
}

function removesTextContainer(
  base: Change['entries'][number]['event']['beforeValue'],
  steps: ReadonlyArray<Step>,
  textBlockType: string,
): boolean {
  return steps.some((step) => {
    if (step.type !== 'remove.node') {
      return false
    }

    const node = getNodeAtPath(base, step.path)
    return (
      node !== undefined &&
      node['_type'] !== textBlockType &&
      containsTextBlock(node, textBlockType)
    )
  })
}

function getNodeAtPath(
  value: ReadonlyArray<unknown>,
  path: ReadonlyArray<string | {_key: string}>,
): Record<string, unknown> | undefined {
  let children: ReadonlyArray<unknown> = value
  let node: Record<string, unknown> | undefined

  for (const segment of path) {
    if (typeof segment === 'string') {
      const field = node?.[segment]
      if (!Array.isArray(field)) {
        return undefined
      }
      children = field
      continue
    }

    const child = children.find(
      (candidate) => isRecord(candidate) && candidate['_key'] === segment._key,
    )
    if (!isRecord(child)) {
      return undefined
    }
    node = child
  }

  return node
}

function containsTextBlock(
  node: Record<string, unknown>,
  textBlockType: string,
): boolean {
  for (const value of Object.values(node)) {
    if (!Array.isArray(value)) {
      continue
    }
    for (const child of value) {
      if (!isRecord(child)) {
        continue
      }
      if (
        child['_type'] === textBlockType ||
        containsTextBlock(child, textBlockType)
      ) {
        return true
      }
    }
  }

  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function changeToPatches(
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
