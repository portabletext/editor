import {isSpan, isTextBlock} from '@portabletext/schema'
import {deleteText, Editor, Element, Range, Transforms} from 'slate'
import {DOMEditor} from 'slate-dom'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {VOID_CHILD_KEY} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'
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
    : operation.editor.selection

  if (!at) {
    throw new Error('Unable to delete without a selection')
  }

  const startPoint = Range.start(at)
  const endPoint = Range.end(at)
  const startBlockIndex = startPoint.path.at(0)
  const endBlockIndex = endPoint.path.at(0)

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

    return
  }

  if (operation.unit === 'child') {
    Transforms.removeNodes(operation.editor, {
      at,
      match: (node) =>
        (isSpan(context, node) && node._key !== VOID_CHILD_KEY) ||
        ('__inline' in node && node.__inline === true),
    })

    return
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = Editor.above(operation.editor, {
      match: (n) => Element.isElement(n) && Editor.isBlock(operation.editor, n),
      at,
    })

    if (parentBlockEntry) {
      const [, parentBlockPath] = parentBlockEntry
      const parentElementRange = Editor.range(
        operation.editor,
        parentBlockPath,
        at.anchor,
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
    if (Range.isCollapsed(at)) {
      deleteText(operation.editor, {
        at,
        unit: 'word',
        reverse: operation.direction === 'backward',
      })

      return
    }
  }

  const reverse = operation.direction === 'backward'
  const startBlock = startBlockIndex
    ? operation.editor.value.at(startBlockIndex)
    : undefined
  const endBlock = endBlockIndex
    ? operation.editor.value.at(endBlockIndex)
    : undefined

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

  if (operation.at) {
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
