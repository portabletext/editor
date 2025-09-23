import {isTextBlock} from '@portabletext/schema'
import {
  deleteText,
  Editor,
  Element,
  Range,
  setSelection,
  Transforms,
} from 'slate'
import {DOMEditor} from 'slate-dom'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {PortableTextSlateEditor} from '../types/editor'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  const anchorBlockKey = getBlockKeyFromSelectionPoint(operation.at.anchor)
  const focusBlockKey = getBlockKeyFromSelectionPoint(operation.at.focus)

  const startBlockKey = operation.at.backward ? focusBlockKey : anchorBlockKey
  const endBlockKey = operation.at.backward ? anchorBlockKey : focusBlockKey
  const endOffset = operation.at.backward
    ? operation.at.focus.offset
    : operation.at.anchor.offset

  if (!startBlockKey) {
    throw new Error('Failed to get start block key')
  }

  if (!endBlockKey) {
    throw new Error('Failed to get end block key')
  }

  const startBlockIndex = operation.editor.blockIndexMap.get(startBlockKey)

  if (startBlockIndex === undefined) {
    throw new Error('Failed to get start block index')
  }

  const startBlock = operation.editor.value.at(startBlockIndex)

  if (!startBlock) {
    throw new Error('Failed to get start block')
  }

  const endBlockIndex = operation.editor.blockIndexMap.get(endBlockKey)

  if (endBlockIndex === undefined) {
    throw new Error('Failed to get end block index')
  }

  const endBlock = operation.editor.value.at(endBlockIndex)

  if (!endBlock) {
    throw new Error('Failed to get end block')
  }

  if (operation.unit === 'block') {
    Transforms.removeNodes(operation.editor, {
      at: {
        anchor: {path: [startBlockIndex], offset: 0},
        focus: {path: [endBlockIndex], offset: 0},
      },
      mode: 'highest',
    })

    if (operation.editor.children.length === 0) {
      Transforms.insertNodes(operation.editor, createPlaceholderBlock(context))
    }

    return
  }

  const range = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.value,
      selection: operation.at,
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!range) {
    throw new Error(
      `Failed to get Slate Range for selection ${JSON.stringify(operation.at)}`,
    )
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = Editor.above(operation.editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(operation.editor, n),
      at: range,
    })

    if (parentBlockEntry) {
      const [, parentBlockPath] = parentBlockEntry
      const parentElementRange = Editor.range(
        operation.editor,
        parentBlockPath,
        range.anchor,
      )

      const currentLineRange = findCurrentLineRange(
        operation.editor,
        parentElementRange,
      )

      if (!Range.isCollapsed(currentLineRange)) {
        Transforms.delete(operation.editor, {at: currentLineRange})
        return
      }
    }
  }

  const hanging = isTextBlock(context, endBlock) && endOffset === 0

  deleteText(operation.editor, {
    at: range,
    reverse: operation.direction === 'backward',
    unit: operation.unit,
    hanging,
  })

  if (
    operation.editor.selection &&
    isTextBlock(context, startBlock) &&
    isTextBlock(context, endBlock)
  ) {
    setSelection(operation.editor, {
      anchor: operation.editor.selection.focus,
      focus: operation.editor.selection.focus,
    })
  }
}

function findCurrentLineRange(
  editor: PortableTextSlateEditor,
  parentRange: Range,
): Range {
  const parentRangeBoundary = Editor.range(editor, Range.end(parentRange))
  const positions = Array.from(Editor.positions(editor, {at: parentRange}))

  let left = 0
  let right = positions.length
  let middle = Math.floor(right / 2)

  if (
    rangesAreOnSameLine(
      editor,
      Editor.range(editor, positions[left]),
      parentRangeBoundary,
    )
  ) {
    return Editor.range(editor, positions[left], parentRangeBoundary)
  }

  if (positions.length < 2) {
    return Editor.range(
      editor,
      positions[positions.length - 1],
      parentRangeBoundary,
    )
  }

  while (middle !== positions.length && middle !== left) {
    if (
      rangesAreOnSameLine(
        editor,
        Editor.range(editor, positions[middle]),
        parentRangeBoundary,
      )
    ) {
      right = middle
    } else {
      left = middle
    }

    middle = Math.floor((left + right) / 2)
  }

  return Editor.range(editor, positions[left], parentRangeBoundary)
}

function rangesAreOnSameLine(editor: DOMEditor, range1: Range, range2: Range) {
  const rect1 = DOMEditor.toDOMRange(editor, range1).getBoundingClientRect()
  const rect2 = DOMEditor.toDOMRange(editor, range2).getBoundingClientRect()

  return domRectsIntersect(rect1, rect2) && domRectsIntersect(rect2, rect1)
}

function domRectsIntersect(rect: DOMRect, compareRect: DOMRect) {
  const middle = (compareRect.top + compareRect.bottom) / 2

  return rect.top <= middle && rect.bottom >= middle
}
