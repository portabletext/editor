import {isSpan} from '@portabletext/schema'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {positions as editorPositions} from '../engine/editor/positions'
import {range as editorRange} from '../engine/editor/range'
import type {Editor} from '../engine/interfaces/editor'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {pathEquals} from '../engine/path/path-equals'
import {comparePoints} from '../engine/point/compare-points'
import {rangeEnd} from '../engine/range/range-end'
import {rangeStart} from '../engine/range/range-start'
import {getNode} from '../traversal/get-node'

/**
 * Compute the visual line range that ends at `parentRange`'s end point
 * (`'backward'`) or starts at its start point (`'forward'`).
 *
 * Used by line-unit deletes (e.g. macOS Cmd+Backspace) to delete to the start
 * or end of the visual line.
 *
 * Layout-aware: requires the editor to be mounted in the DOM.
 */
export function findCurrentLineRange(
  editor: Editor,
  parentRange: Range,
  direction: 'backward' | 'forward' = 'backward',
): Range {
  if (direction === 'forward') {
    return findLineRangeForward(editor, parentRange)
  }

  return findLineRangeBackward(editor, parentRange)
}

function findLineRangeBackward(editor: Editor, parentRange: Range): Range {
  const parentRangeBoundary = editorRange(
    editor,
    rangeEnd(parentRange, editor.snapshot.context),
  )
  const positions = Array.from(editorPositions(editor, {at: parentRange}))

  let left = 0
  let right = positions.length
  let middle = Math.floor(right / 2)

  if (
    rangesAreOnSameLine(
      editor,
      editorRange(editor, positions[left]!),
      parentRangeBoundary,
    )
  ) {
    return editorRange(editor, positions[left]!, parentRangeBoundary)
  }

  if (positions.length < 2) {
    return editorRange(
      editor,
      positions[positions.length - 1]!,
      parentRangeBoundary,
    )
  }

  while (middle !== positions.length && middle !== left) {
    if (
      rangesAreOnSameLine(
        editor,
        editorRange(editor, positions[middle]!),
        parentRangeBoundary,
      )
    ) {
      right = middle
    } else {
      left = middle
    }

    middle = Math.floor((left + right) / 2)
  }

  return editorRange(editor, positions[left]!, parentRangeBoundary)
}

/**
 * Compares the rects of single characters rather than of collapsed points.
 * A collapsed point at a soft wrap offset has no well-defined line: browsers
 * disagree on whether it renders at the end of the line before the wrap or
 * at the start of the line after it. A character always renders on exactly
 * one line.
 *
 * By our convention the caret's line is the line of the character after it.
 * The line's end is the end of the last character on that line, and never
 * goes past an explicit `\n`.
 */
function findLineRangeForward(editor: Editor, parentRange: Range): Range {
  const start = rangeStart(parentRange, editor.snapshot.context)
  const allCharacters = collectCharacters(editor, parentRange)
  const lineBreakIndex = allCharacters.findIndex(
    (character) => character.isLineBreak,
  )
  const characters =
    lineBreakIndex === -1
      ? allCharacters
      : allCharacters.slice(0, lineBreakIndex)

  const firstCharacter = characters[0]
  if (!firstCharacter) {
    return editorRange(editor, start)
  }

  let last = 0
  let left = 1
  let right = characters.length - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    if (rangesAreOnSameLine(editor, characters[middle]!, firstCharacter)) {
      last = middle
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  return editorRange(editor, start, characters[last]!.focus)
}

/**
 * Compute the whole visual line around `point` inside `parentRange`.
 *
 * Both ends come from one line, found the same way as in
 * `findLineRangeForward`: the line of the character after `point`, or of
 * the character before it when `point` is directly before an explicit `\n`
 * or at the end of `parentRange`. The line never crosses an explicit `\n`.
 * Returns a collapsed range at `point` when there is no such character.
 *
 * Layout-aware: requires the editor to be mounted in the DOM.
 */
export function findEntireLineRange(
  editor: Editor,
  parentRange: Range,
  point: Point,
): Range {
  const characters = collectCharacters(editor, parentRange)
  const caretIndex = findCaretCharacterIndex(editor, characters, point)
  const caretCharacter = characters[caretIndex]

  if (!caretCharacter || caretCharacter.isLineBreak) {
    return editorRange(editor, point)
  }

  let paragraphStart = caretIndex
  while (paragraphStart > 0 && !characters[paragraphStart - 1]!.isLineBreak) {
    paragraphStart--
  }

  let paragraphEnd = caretIndex
  while (
    paragraphEnd < characters.length - 1 &&
    !characters[paragraphEnd + 1]!.isLineBreak
  ) {
    paragraphEnd++
  }

  let first = caretIndex
  let left = paragraphStart
  let right = caretIndex - 1

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    if (rangesAreOnSameLine(editor, characters[middle]!, caretCharacter)) {
      first = middle
      right = middle - 1
    } else {
      left = middle + 1
    }
  }

  let last = caretIndex
  left = caretIndex + 1
  right = paragraphEnd

  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    if (rangesAreOnSameLine(editor, characters[middle]!, caretCharacter)) {
      last = middle
      left = middle + 1
    } else {
      right = middle - 1
    }
  }

  return editorRange(editor, characters[first]!.anchor, characters[last]!.focus)
}

function findCaretCharacterIndex(
  editor: Editor,
  characters: Array<Character>,
  point: Point,
): number {
  const nextIndex = characters.findIndex(
    (character) =>
      comparePoints(character.anchor, point, editor.snapshot.context) >= 0,
  )

  if (nextIndex === -1) {
    return characters.length - 1
  }

  if (characters[nextIndex]!.isLineBreak) {
    return nextIndex - 1
  }

  return nextIndex
}

/**
 * Each entry is a character or an inline object, from one position to the
 * next. A span boundary yields both the end of one span and the start of the
 * next node, and the step between them covers nothing.
 */
function collectCharacters(
  editor: Editor,
  parentRange: Range,
): Array<Character> {
  const positions = Array.from(editorPositions(editor, {at: parentRange}))
  const characters: Array<Character> = []

  for (let index = 1; index < positions.length; index++) {
    const anchor = positions[index - 1]!
    const focus = positions[index]!
    const node = getNode(editor.snapshot, anchor.path)?.node
    const isSpanNode = isSpan({schema: editor.snapshot.context.schema}, node)

    if (!pathEquals(anchor.path, focus.path) && isSpanNode) {
      continue
    }

    characters.push({
      anchor,
      focus,
      isLineBreak:
        isSpanNode && node.text.slice(anchor.offset, focus.offset) === '\n',
    })
  }

  return characters
}

type Character = {anchor: Point; focus: Point; isLineBreak: boolean}

function rangesAreOnSameLine(editor: Editor, range1: Range, range2: Range) {
  const rect1 = DOMEditor.toDOMRange(editor, range1).getBoundingClientRect()
  const rect2 = DOMEditor.toDOMRange(editor, range2).getBoundingClientRect()

  return domRectsIntersect(rect1, rect2) && domRectsIntersect(rect2, rect1)
}

function domRectsIntersect(rect: DOMRect, compareRect: DOMRect) {
  const middle = (compareRect.top + compareRect.bottom) / 2

  return rect.top <= middle && rect.bottom >= middle
}
