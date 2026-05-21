import {getDomNode} from '../dom-traversal/get-dom-node'
import {getDomNodePath} from '../dom-traversal/get-dom-node-path'
import type {EditorActor} from '../editor/editor-machine'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getNode} from '../node-traversal/get-node'
import {isEditableContainer} from '../schema/is-editable-container'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import {isDOMNode} from '../slate/dom/utils/dom'
import {isEditor} from '../slate/editor/is-editor'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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

  const onChrome =
    !!eventBlock &&
    !!eventBlockPath &&
    isEventOnChrome(event, eventBlock, eventBlockPath, slateEditor)
  if (
    eventBlock &&
    eventBlockPath &&
    eventPositionBlock &&
    (!eventSelection || onChrome) &&
    // Containers normally fall through to caret-based selection (clicking
    // a container's chrome background is a click into content). But when
    // the event originates from a `contentEditable=false` chrome
    // affordance the container's caret-based selection is wrong - prefer
    // the whole-block selection.
    (!isEventContainer(slateEditor, eventNode, eventPath) || onChrome)
  ) {
    // If we can't find the event selection - OR the event originates from
    // a `contentEditable={false}` chrome affordance inside the block (a
    // drag handle, a language picker, etc.) rather than from actual
    // content - select the entire block. `caretPositionFromPoint` would
    // otherwise land inside the block's first content child, dragging
    // that inner block instead of the block whose chrome was grabbed.
    return {
      block: eventPositionBlock,
      isEditor: false,
      isContainer: false,
      selection: {
        anchor: getBlockStartPoint({
          context: slateEditor,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: slateEditor,
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
          context: slateEditor,
          block: {
            node: eventBlock,
            path: eventBlockPath,
          },
        }),
        focus: getBlockEndPoint({
          context: slateEditor,
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
      : isEditableContainer(slateEditor, eventNode, eventPath),
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

function isEventContainer(
  slateEditor: PortableTextSlateEditor,
  eventNode: Node | PortableTextSlateEditor,
  eventPath: Path,
): boolean {
  if (isEditor(eventNode)) {
    return true
  }
  return isEditableContainer(slateEditor, eventNode, eventPath)
}

/**
 * Did the drag/mouse event originate from a non-editable chrome element
 * inside the block (a drag handle, language picker, button, etc.) rather
 * than from actual content?
 *
 * The discriminator: walk up from `event.target` to the block's DOM
 * element. If we cross a `contentEditable="false"` ancestor along the
 * way, the user grabbed chrome, not text. `caretPositionFromPoint` at the
 * chrome's coordinates would otherwise land inside the block's first
 * inner content node - which is the wrong drag scope for a chrome grab.
 */
function isEventOnChrome(
  event: DragEvent | MouseEvent,
  _eventBlock: Node,
  eventBlockPath: Path,
  slateEditor: PortableTextSlateEditor,
): boolean {
  const target = event.target
  if (!target || !isDOMNode(target)) {
    return false
  }
  const blockElement = getDomNode(slateEditor, eventBlockPath)
  if (!blockElement) {
    return false
  }
  // Walk up from the target. If we hit a contentEditable="false" ancestor
  // BEFORE we hit the block element itself, the target sits inside chrome.
  const domTarget = target as unknown as globalThis.Node
  let cursor: globalThis.Node | null =
    domTarget.nodeType === 1 ? domTarget : (domTarget.parentNode ?? null)
  while (cursor && cursor !== (blockElement as unknown as globalThis.Node)) {
    if (cursor.nodeType === 1) {
      const element = cursor as unknown as Element
      if (element.getAttribute('contenteditable') === 'false') {
        return true
      }
    }
    cursor = cursor.parentNode
  }
  return false
}
