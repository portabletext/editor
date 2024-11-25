import {Descendant, Editor, Path, Transforms} from 'slate'
import {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {isEqualToEmptyEditor} from '../../utils/values'

export function insertBlock({
  block,
  editor,
  schema,
}: {
  block: Descendant
  editor: PortableTextSlateEditor
  schema: PortableTextMemberSchemaTypes
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

    const nextPath = [focusBlockPath[0] + 1]

    Transforms.insertNodes(editor, block, {at: nextPath})
    Transforms.select(editor, {
      anchor: {path: [nextPath[0], 0], offset: 0},
      focus: {path: [nextPath[0], 0], offset: 0},
    })

    if (focusBlock && isEqualToEmptyEditor([focusBlock], schema)) {
      Transforms.removeNodes(editor, {at: focusBlockPath})
    }
  }
}
