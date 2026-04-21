import {getDomNode} from '../dom-traversal/get-dom-node'
import {getDomNodePath} from '../dom-traversal/get-dom-node-path'
import type {EditorActor} from '../editor/editor-machine'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getNode} from '../node-traversal/get-node'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import {isDOMNode} from '../slate/dom/utils/dom'
import {isEditor} from '../slate/editor/is-editor'
import type {Path} from '../slate/interfaces/path'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'

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

  const eventResult = getEventNode({slateEditor, event})

  if (!eventResult) {
    return undefined
  }

  const {node: eventNode, path: eventPath} = eventResult

  const eventBlockEntry = getEnclosingBlock(slateEditor, eventPath)
  const eventBlock = eventBlockEntry?.node
  const eventBlockPath = eventBlockEntry?.path
  const eventPositionBlock = getEventPositionBlock({
    nodePath: eventPath,
    slateEditor,
    event,
  })
  const eventSelection = getSelectionFromEvent(slateEditor, event) ?? null

  if (
    eventBlock &&
    eventBlockPath &&
    eventPositionBlock &&
    !eventSelection &&
    !isEditor(eventNode)
  ) {
    // If we for some reason can't find the event selection, then we default to
    // selecting the entire block that the event originates from.
    return {
      block: eventPositionBlock,
      isEditor: false,
      selection: {
        anchor: getBlockStartPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
      },
    }
  }

  if (!eventPositionBlock || !eventSelection) {
    return undefined
  }

  const eventSelectionFocusBlock = getEnclosingBlock(
    slateEditor,
    eventSelection.focus.path,
  )

  if (!eventSelectionFocusBlock) {
    return undefined
  }

  if (
    isSelectionCollapsed(eventSelection) &&
    eventBlock &&
    eventBlockPath &&
    eventSelectionFocusBlock.node._key !== eventBlock._key
  ) {
    // If the event block and event selection somehow don't match, then the
    // event block takes precedence.
    return {
      block: eventPositionBlock,
      isEditor: false,
      selection: {
        anchor: getBlockStartPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: editorActor.getSnapshot().context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
      },
    }
  }

  return {
    block: eventPositionBlock,
    isEditor: isEditor(eventNode),
    selection: eventSelection,
  }
}

function getEventNode({
  slateEditor,
  event,
}: {
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}) {
  if (!DOMEditor.hasTarget(slateEditor, event.target)) {
    return undefined
  }

  try {
    const path = getDomNodePath(event.target)

    if (path) {
      if (path.length === 0) {
        return {node: slateEditor, path}
      } else {
        const nodeEntry = getNode(slateEditor, path)
        if (nodeEntry) {
          return {node: nodeEntry.node, path}
        }
      }
    }
  } catch (error) {
    console.error(error)
  }

  return undefined
}

function getEventPositionBlock({
  nodePath,
  slateEditor,
  event,
}: {
  nodePath: Path
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EventPositionBlock | undefined {
  const firstBlockEntry = getNode(slateEditor, [0])

  if (!firstBlockEntry) {
    return undefined
  }

  const firstBlockElement = getDomNode(slateEditor, firstBlockEntry.path)

  if (!firstBlockElement) {
    return undefined
  }

  const firstBlockRect = firstBlockElement.getBoundingClientRect()

  if (event.pageY < firstBlockRect.top) {
    return 'start'
  }

  const lastBlock = slateEditor.children.at(-1)
  const lastBlockEntry = lastBlock
    ? getNode(slateEditor, [{_key: lastBlock._key}])
    : undefined

  if (!lastBlockEntry) {
    return undefined
  }

  const lastBlockElement = getDomNode(slateEditor, lastBlockEntry.path)

  if (!lastBlockElement) {
    return undefined
  }

  const lastBlockRef = lastBlockElement.getBoundingClientRect()

  if (event.pageY > lastBlockRef.bottom) {
    return 'end'
  }

  const element = getDomNode(slateEditor, nodePath)

  if (!element) {
    return undefined
  }

  const elementRect = element.getBoundingClientRect()
  const top = elementRect.top
  const height = elementRect.height
  const location = Math.abs(top - event.pageY)

  return location < height / 2 ? 'start' : 'end'
}

function getSelectionFromEvent(
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

  try {
    return DOMEditor.toSlateRange(editor, domRange, {
      exactMatch: false,
      // It can still throw even with this option set to true
      suppressThrow: false,
    })
  } catch {
    return undefined
  }
}
