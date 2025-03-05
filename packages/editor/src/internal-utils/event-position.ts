import type {BaseRange} from 'slate'
import {DOMEditor, isDOMNode} from 'slate-dom'
import {ReactEditor} from 'slate-react'
import type {EditorSelection, EditorSnapshot} from '..'
import * as selectors from '../selectors'
import type {PortableTextSlateEditor} from '../types/editor'
import * as utils from '../utils'
import {toPortableTextRange} from './ranges'

export type EventPosition = {
  block: 'start' | 'end'
  selection: NonNullable<EditorSelection>
}
export type EventPositionBlock = EventPosition['block']

function isClipboardEvent(
  event: DragEvent | ClipboardEvent,
): event is ClipboardEvent {
  return event.type === 'copy' || event.type === 'cut' || event.type === 'paste'
}

export function getEventPosition({
  snapshot,
  slateEditor,
  event,
}: {
  snapshot: EditorSnapshot
  slateEditor: PortableTextSlateEditor
  event: DragEvent | ClipboardEvent
}): EventPosition | undefined {
  if (isClipboardEvent(event)) {
    const selection = snapshot.context.selection

    if (!selection) {
      return undefined
    }

    return {block: 'end', selection}
  }

  const block = getDragPositionBlock({slateEditor, event})
  const selection = getDragPositionSelection({snapshot, slateEditor, event})

  if (!block || !selection) {
    return undefined
  }

  return {block, selection}
}

function getDragPositionBlock({
  slateEditor,
  event,
}: {
  slateEditor: PortableTextSlateEditor
  event: DragEvent
}): EventPositionBlock | undefined {
  if (!ReactEditor.hasTarget(slateEditor, event.target)) {
    return undefined
  }

  const node = ReactEditor.toSlateNode(slateEditor, event.target)
  const element = ReactEditor.toDOMNode(slateEditor, node)
  const elementRect = element.getBoundingClientRect()
  const top = elementRect.top
  const height = elementRect.height
  const location = Math.abs(top - event.pageY)

  return location < height / 2 ? 'start' : 'end'
}

function getDragPositionSelection({
  snapshot,
  slateEditor,
  event,
}: {
  snapshot: EditorSnapshot
  slateEditor: PortableTextSlateEditor
  event: DragEvent
}): EditorSelection {
  const range = findDragSlateRange(slateEditor, event)

  const selection = range
    ? toPortableTextRange(
        snapshot.context.value,
        range,
        snapshot.context.schema,
      )
    : null

  if (!selection) {
    return selection
  }

  const collapsedSelection = selectors.isSelectionCollapsed({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })
  const focusTextBlock = selectors.getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })
  const focusSpan = selectors.getFocusSpan({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection,
    },
  })

  if (
    event.type === 'dragstart' &&
    collapsedSelection &&
    focusTextBlock &&
    focusSpan
  ) {
    // Looks like we are dragging an empty span. Let's drag the entire block
    // instead

    const blockStartPoint = utils.getBlockStartPoint(focusTextBlock)
    const blockEndPoint = utils.getBlockEndPoint(focusTextBlock)

    return {
      anchor: blockStartPoint,
      focus: blockEndPoint,
    }
  }

  return selection
}

function findDragSlateRange(editor: PortableTextSlateEditor, event: DragEvent) {
  if (!event.target) {
    return undefined
  }

  if (!isDOMNode(event.target)) {
    return undefined
  }

  const window = DOMEditor.getWindow(editor)
  const position = window.document.caretPositionFromPoint(
    event.clientX,
    event.clientY,
  )

  if (!position) {
    return undefined
  }

  const domRange = window.document.createRange()
  domRange.setStart(position.offsetNode, position.offset)
  domRange.setEnd(position.offsetNode, position.offset)

  let range: BaseRange | undefined

  try {
    range = DOMEditor.toSlateRange(editor, domRange, {
      exactMatch: false,
      suppressThrow: false,
    })
  } catch {}

  return range
}
