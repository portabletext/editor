import {Editor, type BaseRange, type Node} from 'slate'
import {DOMEditor, isDOMNode} from 'slate-dom'
import type {EditorSchema, EditorSelection} from '..'
import type {EditorActor} from '../editor/editor-machine'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {PortableTextSlateEditor} from '../types/editor'
import * as utils from '../utils'
import {
  getFirstBlock,
  getLastBlock,
  getNodeBlock,
  slateRangeToSelection,
} from './slate-utils'

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
  editorActor,
  slateEditor,
  event,
}: {
  editorActor: EditorActor
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EventPosition | undefined {
  if (editorActor.getSnapshot().matches({setup: 'setting up'})) {
    return undefined
  }

  const eventNode = getEventNode({slateEditor, event})

  if (!eventNode) {
    return undefined
  }

  const eventBlock = getNodeBlock({
    editor: slateEditor,
    schema: editorActor.getSnapshot().context.schema,
    node: eventNode,
  })
  const eventPositionBlock = getEventPositionBlock({
    node: eventNode,
    slateEditor,
    event,
  })
  const eventSelection = getEventSelection({
    schema: editorActor.getSnapshot().context.schema,
    slateEditor,
    event,
  })

  if (
    eventBlock &&
    eventPositionBlock &&
    !eventSelection &&
    !Editor.isEditor(eventNode)
  ) {
    // If we for some reason can't find the event selection, then we default to
    // selecting the entire block that the event originates from.
    return {
      block: eventPositionBlock,
      isEditor: false,
      selection: {
        anchor: utils.getBlockStartPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: [{_key: eventBlock._key}],
          },
        }),
        focus: utils.getBlockEndPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: [{_key: eventBlock._key}],
          },
        }),
      },
    }
  }

  if (!eventPositionBlock || !eventSelection) {
    return undefined
  }

  const eventSelectionFocusBlockKey = getBlockKeyFromSelectionPoint(
    eventSelection.focus,
  )

  if (eventSelectionFocusBlockKey === undefined) {
    return undefined
  }

  if (
    utils.isSelectionCollapsed(eventSelection) &&
    eventBlock &&
    eventSelectionFocusBlockKey !== eventBlock._key
  ) {
    // If the event block and event selection somehow don't match, then the
    // event block takes precedence.
    return {
      block: eventPositionBlock,
      isEditor: false,
      selection: {
        anchor: utils.getBlockStartPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: [{_key: eventBlock._key}],
          },
        }),
        focus: utils.getBlockEndPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: [{_key: eventBlock._key}],
          },
        }),
      },
    }
  }

  return {
    block: eventPositionBlock,
    isEditor: Editor.isEditor(eventNode),
    selection: eventSelection,
  }
}

export function getEventNode({
  slateEditor,
  event,
}: {
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}) {
  if (!DOMEditor.hasTarget(slateEditor, event.target)) {
    return undefined
  }

  const node = DOMEditor.toSlateNode(slateEditor, event.target)

  return node
}

function getEventPositionBlock({
  node,
  slateEditor,
  event,
}: {
  node: Node
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EventPositionBlock | undefined {
  const [firstBlock] = getFirstBlock({editor: slateEditor})

  if (!firstBlock) {
    return undefined
  }

  const firstBlockElement = DOMEditor.toDOMNode(slateEditor, firstBlock)
  const firstBlockRect = firstBlockElement.getBoundingClientRect()

  if (event.pageY < firstBlockRect.top) {
    return 'start'
  }

  const [lastBlock] = getLastBlock({editor: slateEditor})

  if (!lastBlock) {
    return undefined
  }

  const lastBlockElement = DOMEditor.toDOMNode(slateEditor, lastBlock)
  const lastBlockRef = lastBlockElement.getBoundingClientRect()

  if (event.pageY > lastBlockRef.bottom) {
    return 'end'
  }

  const element = DOMEditor.toDOMNode(slateEditor, node)
  const elementRect = element.getBoundingClientRect()
  const top = elementRect.top
  const height = elementRect.height
  const location = Math.abs(top - event.pageY)

  return location < height / 2 ? 'start' : 'end'
}

export function getEventSelection({
  schema,
  slateEditor,
  event,
}: {
  schema: EditorSchema
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EditorSelection {
  const range = getSlateRangeFromEvent(slateEditor, event)

  const selection = range
    ? slateRangeToSelection({
        schema,
        editor: slateEditor,
        range,
      })
    : null

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
      try {
        domRange = window.document.createRange()
        domRange.setStart(position.offsetNode, position.offset)
        domRange.setEnd(position.offsetNode, position.offset)
      } catch {}
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
