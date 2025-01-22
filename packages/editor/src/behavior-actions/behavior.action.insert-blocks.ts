import type {PortableTextBlock} from '@sanity/types'
import {isEqual, uniq} from 'lodash'
import {Editor, Transforms} from 'slate'
import type {EditorSchema} from '../editor/define-schema'
import {isEqualToEmptyEditor, toSlateValue} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'

export function insertBlocks({
  blocks,
  editor,
  schema,
}: {
  blocks: Array<PortableTextBlock>
  editor: PortableTextSlateEditor
  schema: EditorSchema
}) {
  const fragment = toSlateValue(blocks, {schemaTypes: schema})

  if (!editor.selection) {
    return
  }
  // Ensure that markDefs for any annotations inside this fragment are copied over to the focused text block.
  const [focusBlock, focusPath] = Editor.node(editor, editor.selection, {
    depth: 1,
  })

  if (editor.isTextBlock(focusBlock) && editor.isTextBlock(fragment[0])) {
    const {markDefs} = focusBlock
    if (!isEqual(markDefs, fragment[0].markDefs)) {
      Transforms.setNodes(
        editor,
        {
          markDefs: uniq([
            ...(fragment[0].markDefs || []),
            ...(markDefs || []),
          ]),
        },
        {at: focusPath, mode: 'lowest', voids: false},
      )
    }
  }

  const isPasteToEmptyEditor = isEqualToEmptyEditor(editor.children, schema)

  if (isPasteToEmptyEditor) {
    // Special case for pasting directly into an empty editor (a placeholder block).
    // When pasting content starting with multiple empty blocks,
    // `editor.insertFragment` can potentially duplicate the keys of
    // the placeholder block because of operations that happen
    // inside `editor.insertFragment` (involves an `insert_node` operation).
    // However by splitting the placeholder block first in this situation we are good.
    Transforms.splitNodes(editor, {at: [0, 0]})
    editor.insertFragment(fragment)
    Transforms.removeNodes(editor, {at: [0]})
  } else {
    // All other inserts
    editor.insertFragment(fragment)
  }
}
