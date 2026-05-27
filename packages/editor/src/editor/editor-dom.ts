import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {getDomNode} from '../dom-traversal/get-dom-node'
import type {Path} from '../engine/interfaces/path'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {rangeEdges} from '../engine/range/range-edges'
import {getNodes} from '../node-traversal/get-nodes'
import {getSelectionEndBlock, getSelectionStartBlock} from '../selectors'
import {getFragment} from '../selectors/selector.get-fragment'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextEditorEngine} from '../types/editor-engine'
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
  editorEngine: PortableTextEditorEngine,
): EditorDom {
  return {
    getBlockNodes: (snapshot) => getBlockNodes(editorEngine, snapshot),
    getChildNodes: (snapshot) => getChildNodes(editorEngine, snapshot),
    getEditorElement: () => getEditorElement(editorEngine),
    getSelectionRect: (snapshot) => getSelectionRect(snapshot),
    getStartBlockElement: (snapshot) =>
      getStartBlockElement(editorEngine, snapshot),
    getEndBlockElement: (snapshot) =>
      getEndBlockElement(editorEngine, snapshot),
    setDragGhost: ({event, ghost}) => setDragGhost({sendBack, event, ghost}),
  }
}

function getBlockNodes(
  editorEngine: PortableTextEditorEngine,
  snapshot: EditorSnapshot,
): Array<Node> {
  if (!snapshot.context.selection) {
    return []
  }

  try {
    const entries = getFragment(snapshot)

    return entries.flatMap((entry) => {
      const domNode = getDomNode(editorEngine, entry.path)
      return domNode ? [domNode] : []
    })
  } catch {
    return []
  }
}

function getChildNodes(
  editorEngine: PortableTextEditorEngine,
  snapshot: EditorSnapshot,
) {
  if (!snapshot.context.selection) {
    return []
  }

  try {
    const [start, end] = rangeEdges(snapshot.context.selection, editorEngine)
    const childEntries: Array<{node: unknown; path: Path}> = []
    let buffered: {node: unknown; path: Path} | undefined

    for (const entry of getNodes(editorEngine, {
      from: start.path,
      to: end.path,
    })) {
      const entryPath = entry.path

      if (buffered) {
        if (isAncestorPath(buffered.path, entryPath)) {
          buffered = entry
          continue
        }

        childEntries.push(buffered)
      }

      buffered = entry
    }

    if (buffered) {
      childEntries.push(buffered)
    }

    return childEntries.flatMap((childEntry) => {
      const domNode = getDomNode(editorEngine, childEntry.path)

      if (!domNode) {
        return []
      }

      return domNode
    })
  } catch {
    return []
  }
}

function getEditorElement(editorEngine: PortableTextEditorEngine) {
  return getDomNode(editorEngine, [])
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
  editorEngine: PortableTextEditorEngine,
  snapshot: EditorSnapshot,
) {
  const startBlock = getSelectionStartBlock(snapshot)

  if (!startBlock) {
    return null
  }

  const startBlockNode = getDomNode(editorEngine, startBlock.path)

  return startBlockNode instanceof Element ? startBlockNode : null
}

function getEndBlockElement(
  editorEngine: PortableTextEditorEngine,
  snapshot: EditorSnapshot,
) {
  const endBlock = getSelectionEndBlock(snapshot)

  if (!endBlock) {
    return null
  }

  const endBlockNode = getDomNode(editorEngine, endBlock.path)

  return endBlockNode instanceof Element ? endBlockNode : null
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
