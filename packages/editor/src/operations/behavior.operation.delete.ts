import {isSpan, isTextBlock} from '@portabletext/schema'
import {
  deleteText,
  Editor,
  Element,
  Path,
  Point,
  Range,
  Transforms,
  type NodeEntry,
} from 'slate'
import {DOMEditor} from 'slate-dom'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {VOID_CHILD_KEY} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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

  const [start, end] = Range.edges(at)

  if (operation.unit === 'block') {
    const startBlockIndex = start.path.at(0)
    const endBlockIndex = end.path.at(0)

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

  const startBlock = Editor.above(operation.editor, {
    match: (n) => Element.isElement(n) && Editor.isBlock(operation.editor, n),
    at: start,
    voids: false,
  })
  const endBlock = Editor.above(operation.editor, {
    match: (n) => Element.isElement(n) && Editor.isBlock(operation.editor, n),
    at: end,
    voids: false,
  })
  const isAcrossBlocks =
    startBlock && endBlock && !Path.equals(startBlock[1], endBlock[1])
  const startNonEditable =
    Editor.void(operation.editor, {at: start, mode: 'highest'}) ??
    Editor.elementReadOnly(operation.editor, {at: start, mode: 'highest'})
  const endNonEditable =
    Editor.void(operation.editor, {at: end, mode: 'highest'}) ??
    Editor.elementReadOnly(operation.editor, {at: end, mode: 'highest'})

  const matches: NodeEntry[] = []
  let lastPath: Path | undefined

  for (const entry of Editor.nodes(operation.editor, {at, voids: false})) {
    const [node, path] = entry

    if (lastPath && Path.compare(path, lastPath) === 0) {
      continue
    }

    if (
      (Element.isElement(node) &&
        (Editor.isVoid(operation.editor, node) ||
          Editor.isElementReadOnly(operation.editor, node))) ||
      (!Path.isCommon(path, start.path) && !Path.isCommon(path, end.path))
    ) {
      matches.push(entry)
      lastPath = path
    }
  }

  const pathRefs = Array.from(matches, ([, path]) =>
    Editor.pathRef(operation.editor, path),
  )
  const startRef = Editor.pointRef(operation.editor, start)
  const endRef = Editor.pointRef(operation.editor, end)

  const endToEndSelection =
    startBlock &&
    endBlock &&
    Point.equals(start, Editor.start(operation.editor, startBlock[1])) &&
    Point.equals(end, Editor.end(operation.editor, endBlock[1]))

  if (
    endToEndSelection &&
    isAcrossBlocks &&
    !startNonEditable &&
    !endNonEditable
  ) {
    if (!startNonEditable) {
      const point = startRef.current!
      const [node] = Editor.leaf(operation.editor, point)

      if (node.text.length > 0) {
        operation.editor.apply({
          type: 'remove_text',
          path: point.path,
          offset: 0,
          text: node.text,
        })
      }
    }

    for (const pathRef of pathRefs.reverse()) {
      const path = pathRef.unref()

      if (path) {
        Transforms.removeNodes(operation.editor, {at: path, voids: false})
      }
    }

    if (!endNonEditable) {
      const point = endRef.current!
      const [node] = Editor.leaf(operation.editor, point)
      const {path} = point
      const offset = 0
      const text = node.text.slice(offset, end.offset)

      if (text.length > 0) {
        operation.editor.apply({type: 'remove_text', path, offset, text})
      }
    }

    if (endRef.current && startRef.current) {
      Transforms.removeNodes(operation.editor, {
        at: endRef.current,
        voids: false,
      })
    }

    return
  }

  const reverse = operation.direction === 'backward'
  const hanging = reverse
    ? end
      ? isTextBlock(context, endBlock)
        ? end.offset === 0
        : true
      : false
    : start
      ? isTextBlock(context, startBlock)
        ? start.offset === 0
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
