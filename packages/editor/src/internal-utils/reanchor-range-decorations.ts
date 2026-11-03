import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import {makeDiff, type Diff} from '@sanity/diff-match-patch'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

type BlockMatch =
  | {
      type: 'matched'
      key: string
      before: PortableTextBlock
      after: PortableTextBlock
    }
  | {type: 'added'; key: string; after: PortableTextBlock}
  | {type: 'removed'; key: string; before: PortableTextBlock}
  | {
      type: 'split'
      key: string
      before: PortableTextBlock
      after: PortableTextBlock
      splitIntoKey: string
      splitOffset: number
      splitIntoOffset: number
    }
  | {
      type: 'merged'
      key: string
      before: PortableTextBlock
      mergedIntoKey: string
      mergeOffset: number
    }

type AbsolutePoint = {blockKey: string; offset: number}
type PointResult = {point: AbsolutePoint; invalidated: boolean}
type TextEdit = {
  type: 'insert' | 'delete' | 'retain'
  text: string
  position: number
  newPosition: number
}

// Ported from `sanity-labs/collaboration-platform-exploration`'s
// `packages/reanchoring`; keep the client and mutation-layer guesses aligned.
export function reanchorRange(
  beforeBlocks: Array<PortableTextBlock>,
  afterBlocks: Array<PortableTextBlock>,
  range: Range,
): Range | null | undefined {
  const anchor = pointToAbsolute(beforeBlocks, range.anchor)
  const focus = pointToAbsolute(beforeBlocks, range.focus)

  if (!anchor || !focus) {
    return undefined
  }

  const matches = matchBlocks(beforeBlocks, afterBlocks)
  const matchByKey = new Map(matches.map((match) => [match.key, match]))
  const editsByKey = new Map<string, Array<TextEdit>>()

  for (const match of matches) {
    if (match.type !== 'matched' && match.type !== 'split') {
      continue
    }

    const beforeText = extractBlockText(match.before)
    const afterText = extractBlockText(match.after)
    if (beforeText !== afterText) {
      editsByKey.set(match.key, parseDiffs(makeDiff(beforeText, afterText)))
    }
  }

  let shiftedAnchor = shiftPoint(anchor, 'anchor', matchByKey, editsByKey)
  let shiftedFocus = shiftPoint(focus, 'focus', matchByKey, editsByKey)

  if (shiftedAnchor.invalidated && !shiftedFocus.invalidated) {
    shiftedAnchor =
      recoverRemovedEndpoint(
        anchor.blockKey,
        'anchor',
        beforeBlocks,
        afterBlocks,
        matchByKey,
      ) ?? shiftedAnchor
  }
  if (shiftedFocus.invalidated && !shiftedAnchor.invalidated) {
    shiftedFocus =
      recoverRemovedEndpoint(
        focus.blockKey,
        'focus',
        beforeBlocks,
        afterBlocks,
        matchByKey,
      ) ?? shiftedFocus
  }

  if (shiftedAnchor.invalidated || shiftedFocus.invalidated) {
    return null
  }

  const collapsed =
    shiftedAnchor.point.blockKey === shiftedFocus.point.blockKey &&
    shiftedAnchor.point.offset === shiftedFocus.point.offset &&
    (anchor.blockKey !== focus.blockKey || anchor.offset !== focus.offset)
  if (collapsed) {
    return null
  }

  const nextAnchor = absoluteToPoint(afterBlocks, shiftedAnchor.point)
  const nextFocus = absoluteToPoint(afterBlocks, shiftedFocus.point)
  if (!nextAnchor || !nextFocus) {
    return null
  }

  return {anchor: nextAnchor, focus: nextFocus}
}

export function extractBlockText(block: PortableTextBlock): string {
  if (!isTextBlock(block)) {
    return ''
  }
  return block.children
    .filter(isSpan)
    .map((span) => span.text)
    .join('')
}

export function matchBlocks(
  beforeBlocks: Array<PortableTextBlock>,
  afterBlocks: Array<PortableTextBlock>,
): Array<BlockMatch> {
  const beforeKeys = new Set(beforeBlocks.map((block) => block._key))
  const afterByKey = new Map(afterBlocks.map((block) => [block._key, block]))
  const matches: Array<BlockMatch> = []
  const handledNewKeys = new Set<string>()
  const mergedRuns = findMergedRuns(beforeBlocks, afterByKey)

  for (let beforeIndex = 0; beforeIndex < beforeBlocks.length; beforeIndex++) {
    const beforeBlock = beforeBlocks[beforeIndex]!
    const afterBlock = afterByKey.get(beforeBlock._key)

    if (!afterBlock) {
      const mergedRun = mergedRuns.get(beforeBlock._key)
      if (mergedRun) {
        matches.push({
          type: 'merged',
          key: beforeBlock._key,
          before: beforeBlock,
          ...mergedRun,
        })
        continue
      }

      const removedText = extractBlockText(beforeBlock)
      const previousBeforeBlock = beforeBlocks[beforeIndex - 1]
      const previousAfterBlock = previousBeforeBlock
        ? afterByKey.get(previousBeforeBlock._key)
        : undefined

      if (
        removedText &&
        previousBeforeBlock &&
        previousAfterBlock &&
        extractBlockText(previousAfterBlock) ===
          extractBlockText(previousBeforeBlock) + removedText
      ) {
        matches.push({
          type: 'merged',
          key: beforeBlock._key,
          before: beforeBlock,
          mergedIntoKey: previousBeforeBlock._key,
          mergeOffset: extractBlockText(previousBeforeBlock).length,
        })
      } else {
        matches.push({
          type: 'removed',
          key: beforeBlock._key,
          before: beforeBlock,
        })
      }
      continue
    }

    const beforeText = extractBlockText(beforeBlock)
    const afterText = extractBlockText(afterBlock)
    if (afterText.length < beforeText.length) {
      const afterIndex = afterBlocks.indexOf(afterBlock)
      const nextBlock = afterBlocks[afterIndex + 1]
      if (
        nextBlock &&
        !beforeKeys.has(nextBlock._key) &&
        extractBlockText(nextBlock) === beforeText.slice(afterText.length)
      ) {
        matches.push({
          type: 'split',
          key: beforeBlock._key,
          before: beforeBlock,
          after: afterBlock,
          splitIntoKey: nextBlock._key,
          splitOffset: afterText.length,
          splitIntoOffset: 0,
        })
        handledNewKeys.add(nextBlock._key)
        continue
      }
    }

    const commonPrefixLength = getCommonPrefixLength(beforeText, afterText)
    const oldTail = beforeText.slice(commonPrefixLength)
    if (oldTail && commonPrefixLength < beforeText.length) {
      const afterIndex = afterBlocks.indexOf(afterBlock)
      const tailBlock = afterBlocks
        .slice(afterIndex + 1)
        .findLast(
          (candidate) =>
            !beforeKeys.has(candidate._key) &&
            extractBlockText(candidate).endsWith(oldTail),
        )
      if (tailBlock) {
        const tailText = extractBlockText(tailBlock)
        matches.push({
          type: 'split',
          key: beforeBlock._key,
          before: beforeBlock,
          after: afterBlock,
          splitIntoKey: tailBlock._key,
          splitOffset: commonPrefixLength,
          splitIntoOffset: tailText.length - oldTail.length,
        })
        handledNewKeys.add(tailBlock._key)
        continue
      }
    }

    matches.push({
      type: 'matched',
      key: beforeBlock._key,
      before: beforeBlock,
      after: afterBlock,
    })
  }

  for (const afterBlock of afterBlocks) {
    if (
      !beforeKeys.has(afterBlock._key) &&
      !handledNewKeys.has(afterBlock._key)
    ) {
      matches.push({type: 'added', key: afterBlock._key, after: afterBlock})
    }
  }

  return matches
}

function getCommonPrefixLength(left: string, right: string): number {
  let index = 0
  while (
    index < left.length &&
    index < right.length &&
    left[index] === right[index]
  ) {
    index++
  }
  return index
}

function findMergedRuns(
  beforeBlocks: Array<PortableTextBlock>,
  afterByKey: Map<string, PortableTextBlock>,
): Map<string, {mergedIntoKey: string; mergeOffset: number}> {
  const mergedRuns = new Map<
    string,
    {mergedIntoKey: string; mergeOffset: number}
  >()

  for (let index = 1; index < beforeBlocks.length; index++) {
    if (afterByKey.has(beforeBlocks[index]!._key)) {
      continue
    }

    const runStart = index
    while (
      index + 1 < beforeBlocks.length &&
      !afterByKey.has(beforeBlocks[index + 1]!._key)
    ) {
      index++
    }

    const predecessor = beforeBlocks[runStart - 1]!
    const survivingPredecessor = afterByKey.get(predecessor._key)
    if (!survivingPredecessor) {
      continue
    }

    const run = beforeBlocks.slice(runStart, index + 1)
    if (
      extractBlockText(survivingPredecessor) !==
      extractBlockText(predecessor) + run.map(extractBlockText).join('')
    ) {
      continue
    }

    let mergeOffset = extractBlockText(predecessor).length
    for (const block of run) {
      mergedRuns.set(block._key, {
        mergedIntoKey: predecessor._key,
        mergeOffset,
      })
      mergeOffset += extractBlockText(block).length
    }
  }

  return mergedRuns
}

export function parseDiffs(diffs: Array<Diff>): Array<TextEdit> {
  const edits: Array<TextEdit> = []
  let position = 0
  let newPosition = 0

  for (const [operation, text] of diffs) {
    if (operation === 0) {
      edits.push({type: 'retain', text, position, newPosition})
      position += text.length
      newPosition += text.length
    } else if (operation === -1) {
      edits.push({type: 'delete', text, position, newPosition})
      position += text.length
    } else {
      edits.push({type: 'insert', text, position, newPosition})
      newPosition += text.length
    }
  }

  return edits
}

export function shiftPointForInsert(
  point: AbsolutePoint,
  position: number,
  insertLength: number,
  side: 'anchor' | 'focus',
): PointResult {
  const shouldShift =
    side === 'focus' ? point.offset > position : point.offset >= position
  return shouldShift
    ? {
        point: {...point, offset: point.offset + insertLength},
        invalidated: false,
      }
    : {point, invalidated: false}
}

export function shiftPointForDelete(
  point: AbsolutePoint,
  position: number,
  deleteLength: number,
): PointResult {
  const deleteEnd = position + deleteLength
  if (point.offset < position) {
    return {point, invalidated: false}
  }
  if (point.offset < deleteEnd) {
    return {point: {...point, offset: position}, invalidated: false}
  }
  return {
    point: {...point, offset: point.offset - deleteLength},
    invalidated: false,
  }
}

export function shiftPointForReplace(
  point: AbsolutePoint,
  position: number,
  deleteLength: number,
  insertLength: number,
): PointResult {
  const deleteEnd = position + deleteLength
  if (point.offset <= position) {
    return {point, invalidated: false}
  }
  if (point.offset < deleteEnd) {
    return {point: {...point, offset: position}, invalidated: true}
  }
  return {
    point: {...point, offset: point.offset + insertLength - deleteLength},
    invalidated: false,
  }
}

function shiftPoint(
  point: AbsolutePoint,
  side: 'anchor' | 'focus',
  matchByKey: Map<string, BlockMatch>,
  editsByKey: Map<string, Array<TextEdit>>,
): PointResult {
  const match = matchByKey.get(point.blockKey)
  if (!match || match.type === 'removed') {
    return {point, invalidated: true}
  }
  if (match.type === 'merged') {
    return {
      point: {
        blockKey: match.mergedIntoKey,
        offset: point.offset + match.mergeOffset,
      },
      invalidated: false,
    }
  }
  if (match.type === 'split' && point.offset >= match.splitOffset) {
    return {
      point: {
        blockKey: match.splitIntoKey,
        offset: match.splitIntoOffset + point.offset - match.splitOffset,
      },
      invalidated: false,
    }
  }

  let result: PointResult = {point, invalidated: false}
  const edits = editsByKey.get(point.blockKey) ?? []
  for (let index = 0; index < edits.length; index++) {
    const edit = edits[index]!
    if (edit.type === 'retain') {
      continue
    }
    if (edit.type === 'delete') {
      const nextEdit = edits[index + 1]
      if (
        nextEdit?.type === 'insert' &&
        nextEdit.newPosition === edit.newPosition
      ) {
        result = shiftPointForReplace(
          result.point,
          edit.position,
          edit.text.length,
          nextEdit.text.length,
        )
        index++
      } else {
        result = shiftPointForDelete(
          result.point,
          edit.position,
          edit.text.length,
        )
      }
    } else {
      result = shiftPointForInsert(
        result.point,
        edit.newPosition,
        edit.text.length,
        side,
      )
    }
    if (result.invalidated) {
      return result
    }
  }
  return result
}

function recoverRemovedEndpoint(
  removedBlockKey: string,
  side: 'anchor' | 'focus',
  beforeBlocks: Array<PortableTextBlock>,
  afterBlocks: Array<PortableTextBlock>,
  matchByKey: Map<string, BlockMatch>,
): PointResult | undefined {
  const removedIndex = beforeBlocks.findIndex(
    (block) => block._key === removedBlockKey,
  )
  const afterByKey = new Map(afterBlocks.map((block) => [block._key, block]))
  const increment = side === 'anchor' ? 1 : -1

  for (
    let index = removedIndex + increment;
    index >= 0 && index < beforeBlocks.length;
    index += increment
  ) {
    const match = matchByKey.get(beforeBlocks[index]!._key)
    if (!match || match.type === 'removed') {
      continue
    }
    const blockKey = match.type === 'merged' ? match.mergedIntoKey : match.key
    return {
      point: {
        blockKey,
        offset:
          side === 'anchor'
            ? 0
            : extractBlockText(afterByKey.get(blockKey)!).length,
      },
      invalidated: false,
    }
  }
  return undefined
}

function pointToAbsolute(
  blocks: Array<PortableTextBlock>,
  point: Point,
): AbsolutePoint | undefined {
  const blockSegment = point.path[0]
  const childSegment = point.path[2]
  if (!isKeyedSegment(blockSegment) || !isKeyedSegment(childSegment)) {
    return undefined
  }
  const block = blocks.find((candidate) => candidate._key === blockSegment._key)
  if (!block || !isTextBlock(block)) {
    return undefined
  }

  let offset = 0
  for (const child of block.children) {
    if (child._key === childSegment._key) {
      return isSpan(child)
        ? {blockKey: block._key, offset: offset + point.offset}
        : undefined
    }
    if (isSpan(child)) {
      offset += child.text.length
    }
  }
  return undefined
}

function absoluteToPoint(
  blocks: Array<PortableTextBlock>,
  point: AbsolutePoint,
): Point | undefined {
  const block = blocks.find((candidate) => candidate._key === point.blockKey)
  if (!block || !isTextBlock(block)) {
    return undefined
  }

  const spans: Array<PortableTextSpan> = []
  for (const child of block.children) {
    if (isSpan(child)) {
      spans.push(child)
    }
  }
  let offset = 0
  for (const span of spans) {
    const spanEnd = offset + span.text.length
    if (point.offset <= spanEnd) {
      return {
        path: [{_key: block._key}, 'children', {_key: span._key}],
        offset: point.offset - offset,
      }
    }
    offset = spanEnd
  }
  return undefined
}

function isTextBlock(block: PortableTextBlock): block is PortableTextBlock & {
  children: Array<PortableTextSpan | Record<string, unknown>>
} {
  return block._type === 'block' && Array.isArray(block.children)
}

function isSpan(child: unknown): child is PortableTextSpan {
  return (
    typeof child === 'object' &&
    child !== null &&
    '_type' in child &&
    child._type === 'span' &&
    'text' in child &&
    typeof child.text === 'string' &&
    '_key' in child &&
    typeof child._key === 'string'
  )
}
