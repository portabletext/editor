import {getDomNode} from '../dom-traversal/get-dom-node'
import {getDomNodePath} from '../dom-traversal/get-dom-node-path'
import type {EditorActor} from '../editor/editor-machine'
import {DOMEditor} from '../engine/dom/plugin/dom-editor'
import {isDOMNode} from '../engine/dom/utils/dom'
import {end} from '../engine/editor/end'
import {isEditor} from '../engine/editor/is-editor'
import {start} from '../engine/editor/start'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {isEditableContainer} from '../schema/is-editable-container'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import {getNode} from '../traversal/get-node'
import {isLeafObject} from '../traversal/is-leaf-object'
import type {EditorSelection} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isSelectionCollapsed} from '../utils/util.is-selection-collapsed'

export type EventPosition = {
  block: 'start' | 'end'
  /**
   * Did the event originate from the editor root DOM node itself, rather than
   * from a block inside the editor?
   */
  isEditor: boolean
  /**
   * Did the event originate from an editable container's DOM node itself (for
   * example a code block or a table cell), rather than from a block inside the
   * container?
   */
  isContainer: boolean
  selection: NonNullable<EditorSelection>
}
export type EventPositionBlock = EventPosition['block']

export function getEventPosition({
  editorActor,
  editorEngine,
  event,
}: {
  editorActor: EditorActor
  editorEngine: PortableTextEditorEngine
  event: DragEvent | MouseEvent
}): EventPosition | undefined {
  if (editorActor.getSnapshot().matches({setup: 'setting up'})) {
    return undefined
  }

  const eventResult = getEventNode({editorEngine, event})

  if (!eventResult) {
    return undefined
  }

  const {node: eventNode, path: eventPath} = eventResult

  const eventBlockEntry = getEnclosingBlock(editorEngine.snapshot, eventPath)
  const eventBlock = eventBlockEntry?.node
  const eventBlockPath = eventBlockEntry?.path
  const eventPositionBlock = getEventPositionBlock({
    nodePath: eventPath,
    editorEngine,
    event,
  })
  const eventSelection = getSelectionFromEvent(editorEngine, event) ?? null

  if (
    eventBlockPath &&
    eventPositionBlock &&
    !eventSelection &&
    isLeafObject(editorEngine.snapshot, eventNode, eventPath) &&
    eventPath.length > eventBlockPath.length
  ) {
    // An inline object produces no DOM caret selection on `dragstart`, so the
    // whole-block fallback below would widen to the enclosing text block.
    // Select the inline object itself instead.
    return {
      block: eventPositionBlock,
      isEditor: false,
      isContainer: false,
      selection: {
        anchor: {path: eventPath, offset: 0},
        focus: {path: eventPath, offset: 0},
      },
    }
  }

  if (
    eventPositionBlock &&
    !isEditor(eventNode) &&
    isEditableContainer(editorEngine.snapshot, eventNode, eventPath)
  ) {
    // Event originates from a container's own outer wrapper (its chrome)
    // rather than from a block inside it. `getDomNodePath` resolved up
    // past any chrome DOM (no `data-pt-path` between the event target
    // and the container's outer) and landed on the container path. Hold
    // a selection that wraps the container's entire content so the drag
    // pipeline serializes the container envelope as the dragged unit -
    // see `getDragFragment` and the converter's `isContainer` branch.
    // Without this override `caretPositionFromPoint` would resolve to
    // the nearest editable position inside the body and narrow the drag
    // to a single inner block.
    return {
      block: eventPositionBlock,
      isEditor: false,
      isContainer: true,
      selection: {
        anchor: start(editorEngine, eventPath),
        focus: end(editorEngine, eventPath),
      },
    }
  }

  if (
    eventBlock &&
    eventBlockPath &&
    eventPositionBlock &&
    !eventSelection &&
    !isEventContainer(editorEngine, eventNode, eventPath)
  ) {
    // If we for some reason can't find the event selection, then we default to
    // selecting the entire block that the event originates from.
    return {
      block: eventPositionBlock,
      isEditor: false,
      isContainer: false,
      selection: {
        anchor: getBlockStartPoint({
          context: editorEngine.snapshot.context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: editorEngine.snapshot.context,
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
    editorEngine.snapshot,
    eventSelection.focus.path,
  )

  if (!eventSelectionFocusBlock) {
    return undefined
  }

  if (
    isSelectionCollapsed(eventSelection) &&
    eventBlock &&
    eventBlockPath &&
    eventSelectionFocusBlock.node._key !== eventBlock._key &&
    !isAncestorPath(eventBlockPath, eventSelectionFocusBlock.path)
  ) {
    // If the event block and event selection somehow don't match, then the
    // event block takes precedence.
    return {
      block: eventPositionBlock,
      isEditor: false,
      isContainer: false,
      selection: {
        anchor: getBlockStartPoint({
          context: editorEngine.snapshot.context,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: editorEngine.snapshot.context,
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
    isContainer: isEditor(eventNode)
      ? false
      : isEditableContainer(editorEngine.snapshot, eventNode, eventPath),
    selection: eventSelection,
  }
}

function getEventNode({
  editorEngine,
  event,
}: {
  editorEngine: PortableTextEditorEngine
  event: DragEvent | MouseEvent
}) {
  if (!DOMEditor.hasTarget(editorEngine, event.target)) {
    return undefined
  }

  try {
    const path = getDomNodePath(event.target)

    if (path) {
      if (path.length === 0) {
        return {node: editorEngine, path}
      } else {
        const nodeEntry = getNode(editorEngine.snapshot, path)
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
  editorEngine,
  event,
}: {
  nodePath: Path
  editorEngine: PortableTextEditorEngine
  event: DragEvent | MouseEvent
}): EventPositionBlock | undefined {
  const firstBlockEntry = getNode(editorEngine.snapshot, [0])

  if (!firstBlockEntry) {
    return undefined
  }

  const firstBlockElement = getDomNode(editorEngine, firstBlockEntry.path)

  if (!firstBlockElement) {
    return undefined
  }

  const firstBlockRect = firstBlockElement.getBoundingClientRect()

  if (event.pageY < firstBlockRect.top) {
    return 'start'
  }

  const lastBlock = editorEngine.snapshot.context.value.at(-1)
  const lastBlockEntry = lastBlock
    ? getNode(editorEngine.snapshot, [{_key: lastBlock._key}])
    : undefined

  if (!lastBlockEntry) {
    return undefined
  }

  const lastBlockElement = getDomNode(editorEngine, lastBlockEntry.path)

  if (!lastBlockElement) {
    return undefined
  }

  const lastBlockRef = lastBlockElement.getBoundingClientRect()

  if (event.pageY > lastBlockRef.bottom) {
    return 'end'
  }

  const element = getDomNode(editorEngine, nodePath)

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
  editor: PortableTextEditorEngine,
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
    return DOMEditor.toEditorSelection(editor, domRange, {
      exactMatch: false,
      // It can still throw even with this option set to true
      suppressThrow: false,
    })
  } catch {
    return undefined
  }
}

function isEventContainer(
  editorEngine: PortableTextEditorEngine,
  eventNode: Node | PortableTextEditorEngine,
  eventPath: Path,
): boolean {
  if (isEditor(eventNode)) {
    return true
  }
  return isEditableContainer(editorEngine.snapshot, eventNode, eventPath)
}
