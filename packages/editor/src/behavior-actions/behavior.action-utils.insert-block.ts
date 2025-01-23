import {Editor, Transforms, type Descendant} from 'slate'
import type {EditorSchema} from '../editor/define-schema'
import {isEqualToEmptyEditor} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'

export function insertBlock({
  block,
  placement,
  editor,
  schema,
}: {
  block: Descendant
  placement: 'auto' | 'after' | 'before'
  editor: PortableTextSlateEditor
  schema: EditorSchema
}) {
  if (!editor.selection) {
    const lastBlock = Array.from(
      Editor.nodes(editor, {
        match: (n) => !Editor.isEditor(n),
        at: [],
        reverse: true,
      }),
    )[0]

    // If there is no selection, let's just insert the new block at the
    // end of the document
    Editor.insertNode(editor, block)

    if (lastBlock && isEqualToEmptyEditor([lastBlock[0]], schema)) {
      // And if the last block was an empty text block, let's remove
      // that too
      Transforms.removeNodes(editor, {at: lastBlock[1]})
    }
  } else {
    const [focusBlock, focusBlockPath] = Array.from(
      Editor.nodes(editor, {
        at: editor.selection.focus.path.slice(0, 1),
        match: (n) => !Editor.isEditor(n),
      }),
    )[0] ?? [undefined, undefined]

    if (placement === 'after') {
      const nextPath = [focusBlockPath[0] + 1]

      Transforms.insertNodes(editor, block, {at: nextPath})
      Transforms.select(editor, {
        anchor: {path: [nextPath[0], 0], offset: 0},
        focus: {path: [nextPath[0], 0], offset: 0},
      })
    } else if (placement === 'before') {
      Transforms.insertNodes(editor, block, {at: focusBlockPath})
    } else {
      Editor.insertNode(editor, block)

      if (focusBlock && isEqualToEmptyEditor([focusBlock], schema)) {
        Transforms.removeNodes(editor, {at: focusBlockPath})
      }
    }
  }
}
