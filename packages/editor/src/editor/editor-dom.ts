import {Editor} from 'slate'
import {DOMEditor} from 'slate-dom'
import type {EditorSnapshot} from '..'
import type {BehaviorEvent} from '../behaviors'
import {toSlateRange} from '../internal-utils/ranges'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/editor'

export type EditorDom = {
  getBlockNodes: (snapshot: EditorSnapshot) => Array<Node>
  getChildNodes: (snapshot: EditorSnapshot) => Array<Node>
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

  const range = toSlateRange(snapshot.context.selection, slateEditor)

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

  const range = toSlateRange(snapshot.context.selection, slateEditor)

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

export type SelectionDomNodes = {
  blockNodes: Array<Node>
  childNodes: Array<Node>
}

export function getSelectionDomNodes({
  slateEditor,
  snapshot,
}: {
  slateEditor: PortableTextSlateEditor
  snapshot: EditorSnapshot
}): SelectionDomNodes {
  if (!snapshot.context.selection) {
    return {
      blockNodes: [],
      childNodes: [],
    }
  }

  const range = toSlateRange(snapshot.context.selection, slateEditor)

  if (!range) {
    return {
      blockNodes: [],
      childNodes: [],
    }
  }

  const blockEntries = Array.from(
    Editor.nodes(slateEditor, {
      at: range,
      mode: 'highest',
      match: (n) => !Editor.isEditor(n),
    }),
  )

  const childEntries = Array.from(
    Editor.nodes(slateEditor, {
      at: range,
      mode: 'lowest',
      match: (n) =>
        (!Editor.isEditor(n) && slateEditor.isTextSpan(n)) ||
        !slateEditor.isBlock(n),
    }),
  )

  return {
    blockNodes: blockEntries.map(([blockNode]) =>
      DOMEditor.toDOMNode(slateEditor, blockNode),
    ),
    childNodes: childEntries.map(([childNode]) =>
      DOMEditor.toDOMNode(slateEditor, childNode),
    ),
  }
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
