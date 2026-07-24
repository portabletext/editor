import {
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  makeDiff,
  type Patch,
} from '@sanity/diff-match-patch'

type BranchProjection = {
  insertions: Map<number, string>
  retainedBaseText: Array<boolean>
}

export type StrictPatchApplication = {
  matchedRanges: Array<{start: number; end: number}>
  text: string
}

export function applyPatchesStrictly(
  patches: ReadonlyArray<Patch>,
  sourceText: string,
): StrictPatchApplication | undefined {
  let displacement = 0
  let text = sourceText
  const matchedRanges: Array<{start: number; end: number}> = []

  for (const patch of patches) {
    const sourcePattern = patch.diffs
      .filter(([operation]) => operation !== DIFF_INSERT)
      .map(([, value]) => value)
      .join('')
    const targetPattern = patch.diffs
      .filter(([operation]) => operation !== DIFF_DELETE)
      .map(([, value]) => value)
      .join('')
    const expectedOffset =
      utf8OffsetToStringOffset(text, patch.utf8Start2) + displacement
    const matchOffset = findNearestExactMatch(
      text,
      sourcePattern,
      expectedOffset,
    )

    if (matchOffset === undefined) {
      return undefined
    }

    matchedRanges.push({
      start: matchOffset,
      end: matchOffset + sourcePattern.length,
    })
    text =
      text.slice(0, matchOffset) +
      targetPattern +
      text.slice(matchOffset + sourcePattern.length)
    displacement += matchOffset - expectedOffset
  }

  return {matchedRanges, text}
}

export function mergeSpanText(
  baseText: string,
  localText: string,
  remoteText: string,
): string {
  if (localText === remoteText) {
    return localText
  }

  if (localText === baseText) {
    return remoteText
  }

  if (remoteText === baseText) {
    return localText
  }

  const localProjection = projectBranch(baseText, localText)
  const remoteProjection = projectBranch(baseText, remoteText)

  let mergedText = ''

  for (let offset = 0; offset <= baseText.length; offset++) {
    mergedText += mergeInsertions(
      localProjection.insertions.get(offset),
      remoteProjection.insertions.get(offset),
    )

    if (
      offset < baseText.length &&
      localProjection.retainedBaseText[offset] &&
      remoteProjection.retainedBaseText[offset]
    ) {
      mergedText += baseText.slice(offset, offset + 1)
    }
  }

  return mergedText
}

function projectBranch(baseText: string, branchText: string): BranchProjection {
  const retainedBaseText = Array.from({length: baseText.length}, () => true)
  const insertions = new Map<number, string>()
  let baseOffset = 0

  for (const [operation, text] of makeDiff(baseText, branchText)) {
    if (operation === DIFF_EQUAL) {
      baseOffset += text.length
    } else if (operation === DIFF_DELETE) {
      retainedBaseText.fill(false, baseOffset, baseOffset + text.length)
      baseOffset += text.length
    } else if (operation === DIFF_INSERT) {
      insertions.set(baseOffset, (insertions.get(baseOffset) ?? '') + text)
    }
  }

  return {insertions, retainedBaseText}
}

function findNearestExactMatch(
  text: string,
  pattern: string,
  expectedOffset: number,
): number | undefined {
  const boundedExpectedOffset = Math.max(
    0,
    Math.min(expectedOffset, text.length),
  )

  if (pattern.length === 0) {
    return boundedExpectedOffset
  }

  let matchOffset = text.indexOf(pattern)
  let nearestOffset: number | undefined
  let nearestDistance = Infinity
  let nearestIsAmbiguous = false

  while (matchOffset !== -1) {
    const distance = Math.abs(matchOffset - boundedExpectedOffset)

    if (distance < nearestDistance) {
      nearestOffset = matchOffset
      nearestDistance = distance
      nearestIsAmbiguous = false
    } else if (distance === nearestDistance) {
      nearestIsAmbiguous = true
    }

    matchOffset = text.indexOf(pattern, matchOffset + 1)
  }

  return nearestIsAmbiguous ? undefined : nearestOffset
}

function mergeInsertions(
  localInsertion: string | undefined,
  remoteInsertion: string | undefined,
): string {
  if (localInsertion === undefined) {
    return remoteInsertion ?? ''
  }

  if (remoteInsertion === undefined) {
    return localInsertion
  }

  if (localInsertion === remoteInsertion) {
    return localInsertion
  }

  return localInsertion < remoteInsertion
    ? localInsertion + remoteInsertion
    : remoteInsertion + localInsertion
}

function utf8OffsetToStringOffset(text: string, utf8Offset: number): number {
  let byteOffset = 0
  let stringOffset = 0

  while (stringOffset < text.length && byteOffset < utf8Offset) {
    const codePoint = text.codePointAt(stringOffset)
    if (codePoint === undefined) {
      break
    }

    byteOffset += utf8Length(codePoint)
    stringOffset += codePoint > 0xffff ? 2 : 1
  }

  return stringOffset
}

function utf8Length(codePoint: number): 1 | 2 | 3 | 4 {
  if (codePoint <= 0x7f) {
    return 1
  }
  if (codePoint <= 0x7ff) {
    return 2
  }
  if (codePoint <= 0xffff) {
    return 3
  }
  return 4
}
