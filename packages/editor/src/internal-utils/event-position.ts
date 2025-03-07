import {Editor, type BaseRange} from 'slate'
import {DOMEditor, isDOMNode} from 'slate-dom'
import {ReactEditor} from 'slate-react'
import type {EditorSelection, EditorSnapshot} from '..'
import * as selectors from '../selectors'
import type {PortableTextSlateEditor} from '../types/editor'
import * as utils from '../utils'
import {toPortableTextRange} from './ranges'

export type EventPosition = {
  block: 'start' | 'end'
  /**
   * Did the event origin from the editor DOM node itself or from a child node?
   */
  isEditor: boolean
  selection: NonNullable<EditorSelection>
}
export type EventPositionBlock = EventPosition['block']

export function getEventPosition({
  snapshot,
  slateEditor,
  event,
}: {
  snapshot: EditorSnapshot
  slateEditor: PortableTextSlateEditor
  event: DragEvent | ClipboardEvent | MouseEvent
}): EventPosition | undefined {
  if (!DOMEditor.hasTarget(slateEditor, event.target)) {
    return undefined
  }

  const node = DOMEditor.toSlateNode(slateEditor, event.target)

  if (isClipboardEvent(event)) {
    const selection = snapshot.context.selection

    if (!selection) {
      return undefined
    }

    return {
      block: 'end',
      isEditor: Editor.isEditor(node),
      selection,
    }
  }

  const block = getEventPositionBlock({slateEditor, event})
  const selection = getEventPositionSelection({snapshot, slateEditor, event})

  if (!block || !selection) {
    return undefined
  }

  return {
    block,
    isEditor: Editor.isEditor(node),
    selection,
  }
}

function getEventPositionBlock({
  slateEditor,
  event,
}: {
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
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

function getEventPositionSelection({
  snapshot,
  slateEditor,
  event,
}: {
  snapshot: EditorSnapshot
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EditorSelection {
  const range = getSlateRangeFromEvent(slateEditor, event)

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

function getSlateRangeFromEvent(
  editor: PortableTextSlateEditor,
  event: DragEvent | MouseEvent,
) {
  if (!event.target) {
    return undefined
  }

  if (!isDOMNode(event.target)) {
    return undefined
  }

  const window = DOMEditor.getWindow(editor)

  let domRange: Range | undefined

  if (window.document.caretPositionFromPoint !== undefined) {
    const position = window.document.caretPositionFromPoint(
      event.clientX,
      event.clientY,
    )

    if (position) {
      domRange = window.document.createRange()
      domRange.setStart(position.offsetNode, position.offset)
      domRange.setEnd(position.offsetNode, position.offset)
    }
  } else if (window.document.caretRangeFromPoint !== undefined) {
    // Use WebKit-proprietary fallback method
    domRange =
      window.document.caretRangeFromPoint(event.clientX, event.clientY) ??
      undefined
  } else {
    console.warn(
      'Neither caretPositionFromPoint nor caretRangeFromPoint is supported',
    )
    return undefined
  }

  if (!domRange) {
    return undefined
  }

  let range: BaseRange | undefined

  try {
    range = DOMEditor.toSlateRange(editor, domRange, {
      exactMatch: false,
      // It can still throw even with this option set to true
      suppressThrow: false,
    })
  } catch {}

  return range
}

function isClipboardEvent(
  event: DragEvent | ClipboardEvent | MouseEvent,
): event is ClipboardEvent {
  return event.type === 'copy' || event.type === 'cut' || event.type === 'paste'
}
