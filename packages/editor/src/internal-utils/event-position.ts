import {Editor, type BaseRange, type Node} from 'slate'
import {DOMEditor, isDOMNode} from 'slate-dom'
import type {EditorSchema, EditorSelection} from '..'
import type {PortableTextSlateEditor} from '../types/editor'
import * as utils from '../utils'
import {toPortableTextRange} from './ranges'
import {getFirstBlock, getLastBlock, getNodeBlock} from './slate-utils'
import {fromSlateValue} from './values'

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
  schema,
  slateEditor,
  event,
}: {
  schema: EditorSchema
  slateEditor: PortableTextSlateEditor
  event: DragEvent | MouseEvent
}): EventPosition | undefined {
  const node = getEventNode({slateEditor, event})

  if (!node) {
    return undefined
  }

  const block = getNodeBlock({
    editor: slateEditor,
    schema,
    node,
  })

  const positionBlock = getEventPositionBlock({node, slateEditor, event})
  const selection = getEventSelection({
    schema,
    slateEditor,
    event,
  })

  if (block && positionBlock && !selection && !Editor.isEditor(node)) {
    return {
      block: positionBlock,
      isEditor: false,
      selection: {
        anchor: utils.getBlockStartPoint({
          node: block,
          path: [{_key: block._key}],
        }),
        focus: utils.getBlockEndPoint({
          node: block,
          path: [{_key: block._key}],
        }),
      },
    }
  }

  if (!positionBlock || !selection) {
    return undefined
  }

  const focusBlockPath = selection.focus.path.at(0)
  const focusBlockKey = utils.isKeyedSegment(focusBlockPath)
    ? focusBlockPath._key
    : undefined

  if (!focusBlockKey) {
    return undefined
  }

  if (
    utils.isSelectionCollapsed(selection) &&
    block &&
    focusBlockKey !== block._key
  ) {
    return {
      block: positionBlock,
      isEditor: false,
      selection: {
        anchor: utils.getBlockStartPoint({
          node: block,
          path: [{_key: block._key}],
        }),
        focus: utils.getBlockEndPoint({
          node: block,
          path: [{_key: block._key}],
        }),
      },
    }
  }

  return {
    block: positionBlock,
    isEditor: Editor.isEditor(node),
    selection,
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
    ? toPortableTextRange(
        fromSlateValue(slateEditor.children, schema.block.name),
        range,
        schema,
      )
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
