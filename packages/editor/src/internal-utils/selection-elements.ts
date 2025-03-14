import {Editor} from 'slate'
import {DOMEditor} from 'slate-dom'
import type {EditorSnapshot} from '..'
import type {PortableTextSlateEditor} from '../types/editor'
import {toSlateRange} from './ranges'

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
