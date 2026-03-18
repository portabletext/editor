import type {EditorActor} from '../editor/editor-machine'
import type {EditorSchema} from '../editor/editor-schema'
import {getDomNodePath} from '../paths/get-dom-node-path'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import {isDOMNode} from '../slate/dom/utils/dom'
import {isEditor} from '../slate/editor/is-editor'
import type {Path} from '../slate/interfaces/path'
import type {Range as SlateRange} from '../slate/interfaces/range'
import {getNodeIf} from '../slate/node/get-node-if'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
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

  const eventResult = getEventNode({slateEditor, event})

  if (!eventResult) {
    return undefined
  }

  const {node: eventNode, path: eventPath} = eventResult

  const eventBlock = getNodeBlock({
    editor: slateEditor,
    schema: editorActor.getSnapshot().context.schema,
    node: eventNode,
  })
  const eventPositionBlock = getEventPositionBlock({
    nodePath: eventPath,
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
            path: [{_key: eventBlock._key}],
          },
        }),
        focus: getBlockEndPoint({
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
    isSelectionCollapsed(eventSelection) &&
    eventBlock &&
    eventSelectionFocusBlockKey !== eventBlock._key
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
            path: [{_key: eventBlock._key}],
          },
        }),
        focus: getBlockEndPoint({
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
    const indexedPath = path
      ? keyedPathToIndexedPath(slateEditor, path, slateEditor.blockIndexMap)
      : undefined

    if (indexedPath) {
      if (indexedPath.length === 0) {
        return {node: slateEditor, path: indexedPath}
      } else {
        const node = getNodeIf(slateEditor, indexedPath, slateEditor.schema)
        if (node) {
          return {node, path: indexedPath}
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
  const [firstBlock, firstBlockPath] = getFirstBlock({editor: slateEditor})

  if (!firstBlock) {
    return undefined
  }

  let firstBlockElement: HTMLElement | undefined

  try {
    firstBlockElement = DOMEditor.toDOMNode(slateEditor, firstBlockPath)
  } catch (error) {
    console.error(error)
  }

  if (!firstBlockElement) {
    return undefined
  }

  const firstBlockRect = firstBlockElement.getBoundingClientRect()

  if (event.pageY < firstBlockRect.top) {
    return 'start'
  }

  const [lastBlock, lastBlockPath] = getLastBlock({editor: slateEditor})

  if (!lastBlock) {
    return undefined
  }

  let lastBlockElement: HTMLElement | undefined

  try {
    lastBlockElement = DOMEditor.toDOMNode(slateEditor, lastBlockPath)
  } catch (error) {
    console.error(error)
  }

  if (!lastBlockElement) {
    return undefined
  }

  const lastBlockRef = lastBlockElement.getBoundingClientRect()

  if (event.pageY > lastBlockRef.bottom) {
    return 'end'
  }

  let element: HTMLElement | undefined

  try {
    element = DOMEditor.toDOMNode(slateEditor, nodePath)
  } catch (error) {
    console.error(error)
  }

  if (!element) {
    return undefined
  }

  const elementRect = element.getBoundingClientRect()
  const top = elementRect.top
  const height = elementRect.height
  const location = Math.abs(top - event.pageY)

  return location < height / 2 ? 'start' : 'end'
}

function getEventSelection({
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

  let range: SlateRange | undefined

  try {
    range = DOMEditor.toSlateRange(editor, domRange, {
      exactMatch: false,
      // It can still throw even with this option set to true
      suppressThrow: false,
    })
  } catch {}

  return range
}
