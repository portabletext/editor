import type {BehaviorEvent} from '../behaviors/behavior.types.event'
import {getDomNode} from '../dom-traversal/get-dom-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {getNodes} from '../node-traversal/get-nodes'
import {getSelectionEndBlock, getSelectionStartBlock} from '../selectors'
import type {Path} from '../slate/interfaces/path'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {rangeEdges} from '../slate/range/range-edges'
import type {PickFromUnion} from '../type-utils'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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
    const [start, end] = rangeEdges(range, {}, slateEditor)
    const blockEntries: Array<{node: unknown; path: Path}> = []
    let lastHighestPath: Path | undefined

    for (const entry of getNodes(slateEditor, {
      from: start.path,
      to: end.path,
    })) {
      const entryPath = entry.path

      if (lastHighestPath && isAncestorPath(lastHighestPath, entryPath)) {
        continue
      }

      lastHighestPath = entryPath
      blockEntries.push(entry)
    }

    return blockEntries.flatMap((blockEntry) => {
      const domNode = getDomNode(slateEditor, blockEntry.path)

      if (!domNode) {
        return []
      }

      return domNode
    })
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
    const [start, end] = rangeEdges(range, {}, slateEditor)
    const childEntries: Array<{node: unknown; path: Path}> = []
    let buffered: {node: unknown; path: Path} | undefined

    for (const entry of getNodes(slateEditor, {
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
      const domNode = getDomNode(slateEditor, childEntry.path)

      if (!domNode) {
        return []
      }

      return domNode
    })
  } catch {
    return []
  }
}

function getEditorElement(slateEditor: PortableTextSlateEditor) {
  return getDomNode(slateEditor, [])
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
