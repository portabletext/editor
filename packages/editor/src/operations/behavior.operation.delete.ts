import {isTextBlock} from '@portabletext/schema'
import {deleteText, Editor, Element, Range, Transforms} from 'slate'
import {DOMEditor} from 'slate-dom'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {PortableTextSlateEditor} from '../types/editor'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const deleteOperationImplementation: BehaviorOperationImplementation<
  'delete'
> = ({context, operation}) => {
  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : undefined

  const selection = operation.editor.selection
    ? slateRangeToSelection({
        schema: context.schema,
        editor: operation.editor,
        range: operation.editor.selection,
      })
    : undefined

  const reverse = operation.direction === 'backward'
  const anchorPoint = operation.at?.anchor ?? selection?.anchor
  const focusPoint = operation.at?.focus ?? selection?.focus
  const startPoint = reverse ? focusPoint : anchorPoint
  const endPoint = reverse ? anchorPoint : focusPoint
  const startBlockKey = startPoint
    ? getBlockKeyFromSelectionPoint(startPoint)
    : undefined
  const endBlockKey = endPoint
    ? getBlockKeyFromSelectionPoint(endPoint)
    : undefined
  const startBlockIndex = startBlockKey
    ? operation.editor.blockIndexMap.get(startBlockKey)
    : undefined
  const endBlockIndex = endBlockKey
    ? operation.editor.blockIndexMap.get(endBlockKey)
    : undefined
  const startBlock = startBlockIndex
    ? operation.editor.value.at(startBlockIndex)
    : undefined
  const endBlock = endBlockIndex
    ? operation.editor.value.at(endBlockIndex)
    : undefined

  if (operation.unit === 'block') {
    if (startBlockIndex === undefined || endBlockIndex === undefined) {
      throw new Error('Failed to get start or end block index')
    }

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

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const range = at ?? operation.editor.selection ?? undefined

    if (!range) {
      throw new Error('Unable to delete line without a selection')
    }

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

  if (operation.unit === 'word') {
    const range = at ?? operation.editor.selection ?? undefined

    if (!range) {
      throw new Error('Unable to delete word without a selection')
    }

    if (Range.isCollapsed(range)) {
      deleteText(operation.editor, {
        at: range,
        unit: 'word',
        reverse: operation.direction === 'backward',
      })

      return
    }
  }

  const hanging = reverse
    ? endPoint
      ? isTextBlock(context, endBlock)
        ? endPoint.offset === 0
        : true
      : false
    : startPoint
      ? isTextBlock(context, startBlock)
        ? startPoint.offset === 0
        : true
      : false

  if (at) {
    deleteText(operation.editor, {
      at,
      hanging,
      reverse,
    })
  } else {
    deleteText(operation.editor, {
      hanging,
      reverse,
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
