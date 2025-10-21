import {Editor} from 'slate'
import {DOMEditor} from 'slate-dom'
import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {getSelectionEndBlock, getSelectionStartBlock} from '../selectors'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSnapshot} from './editor-snapshot'

export type EditorDom = {
  getBlockNodes: (snapshot: EditorSnapshot) => Array<Node>
  getChildNodes: (snapshot: EditorSnapshot) => Array<Node>
  getEditorElement: () => Element | undefined
  getSelectionRect: (snapshot: EditorSnapshot) => DOMRect | null
  getStartBlockElement: (snapshot: EditorSnapshot) => Element | null
  getEndBlockElement: (snapshot: EditorSnapshot) => Element | null
  /**
   * Let the Editor set the drag ghost. This is to be sure that it will get
   * properly removed again when the drag ends.
   */
  setDragGhost: ({
    event,
    ghost,
  }: {
    event: PickFromUnion<BehaviorEvent, 'type', 'drag.dragstart'>
    ghost: {
      element: HTMLElement
      x: number
      y: number
    }
  }) => void
}

export function createEditorDom(
  sendBack: (event: {type: 'set drag ghost'; ghost: HTMLElement}) => void,
  slateEditor: PortableTextSlateEditor,
): EditorDom {
  return {
    getBlockNodes: (snapshot) => getBlockNodes(slateEditor, snapshot),
    getChildNodes: (snapshot) => getChildNodes(slateEditor, snapshot),
    getEditorElement: () => getEditorElement(slateEditor),
    getSelectionRect: (snapshot) => getSelectionRect(snapshot),
    getStartBlockElement: (snapshot) =>
      getStartBlockElement(slateEditor, snapshot),
    getEndBlockElement: (snapshot) => getEndBlockElement(slateEditor, snapshot),
    setDragGhost: ({event, ghost}) => setDragGhost({sendBack, event, ghost}),
  }
}

function getBlockNodes(
  slateEditor: PortableTextSlateEditor,
  snapshot: EditorSnapshot,
) {
  if (!snapshot.context.selection) {
    return []
  }

  const range = toSlateRange(snapshot)

  if (!range) {
    return []
  }

  try {
    const blockEntries = Array.from(
      Editor.nodes(slateEditor, {
        at: range,
        mode: 'highest',
        match: (n) => !Editor.isEditor(n),
      }),
    )

    return blockEntries.map(([blockNode]) =>
      DOMEditor.toDOMNode(slateEditor, blockNode),
    )
  } catch {
    return []
  }
}

function getChildNodes(
  slateEditor: PortableTextSlateEditor,
  snapshot: EditorSnapshot,
) {
  if (!snapshot.context.selection) {
    return []
  }

  const range = toSlateRange(snapshot)

  if (!range) {
    return []
  }

  try {
    const childEntries = Array.from(
      Editor.nodes(slateEditor, {
        at: range,
        mode: 'lowest',
        match: (n) => !Editor.isEditor(n),
      }),
    )

    return childEntries.map(([childNode]) =>
      DOMEditor.toDOMNode(slateEditor, childNode),
    )
  } catch {
    return []
  }
}

function getEditorElement(slateEditor: PortableTextSlateEditor) {
  try {
    return DOMEditor.toDOMNode(slateEditor, slateEditor)
  } catch {
    return undefined
  }
}

function getSelectionRect(snapshot: EditorSnapshot) {
  if (!snapshot.context.selection) {
    return null
  }

  try {
    const selection = window.getSelection()

    if (!selection) {
      return null
    }

    const range = selection.getRangeAt(0)
    return range.getBoundingClientRect()
  } catch {
    return null
  }
}

function getStartBlockElement(
  slateEditor: PortableTextSlateEditor,
  snapshot: EditorSnapshot,
) {
  const startBlock = getSelectionStartBlock(snapshot)

  if (!startBlock) {
    return null
  }

  const startBlockNode = getBlockNodes(slateEditor, {
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: {
          path: startBlock.path,
          offset: 0,
        },
        focus: {
          path: startBlock.path,
          offset: 0,
        },
      },
    },
  })?.at(0)

  return startBlockNode && startBlockNode instanceof Element
    ? startBlockNode
    : null
}

function getEndBlockElement(
  slateEditor: PortableTextSlateEditor,
  snapshot: EditorSnapshot,
) {
  const endBlock = getSelectionEndBlock(snapshot)

  if (!endBlock) {
    return null
  }

  const endBlockNode = getBlockNodes(slateEditor, {
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: {
          path: endBlock.path,
          offset: 0,
        },
        focus: {
          path: endBlock.path,
          offset: 0,
        },
      },
    },
  })?.at(0)

  return endBlockNode && endBlockNode instanceof Element ? endBlockNode : null
}

function setDragGhost({
  sendBack,
  event,
  ghost,
}: {
  sendBack: (event: {type: 'set drag ghost'; ghost: HTMLElement}) => void
  event: PickFromUnion<BehaviorEvent, 'type', 'drag.dragstart'>
  ghost: {
    element: HTMLElement
    x: number
    y: number
  }
}) {
  event.originEvent.dataTransfer.setDragImage(ghost.element, ghost.x, ghost.y)

  sendBack({
    type: 'set drag ghost',
    ghost: ghost.element,
  })
}
