import {isEqual, uniq} from 'lodash'
import {Editor, Transforms, type Descendant} from 'slate'
import {debugWithName} from '../../internal-utils/debug'
import {isEqualToEmptyEditor} from '../../internal-utils/values'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'

const debug = debugWithName('plugin:withInsertData')

/**
 * Shared helper function to insert the final fragment into the editor
 *
 * @internal
 */
export function _insertFragment(
  editor: PortableTextSlateEditor,
  fragment: Descendant[],
  schemaTypes: PortableTextMemberSchemaTypes,
) {
  editor.withoutNormalizing(() => {
    if (!editor.selection) {
      return
    }
    // Ensure that markDefs for any annotations inside this fragment are copied over to the focused text block.
    const [focusBlock, focusPath] = Editor.node(editor, editor.selection, {
      depth: 1,
    })
    if (editor.isTextBlock(focusBlock) && editor.isTextBlock(fragment[0])) {
      const {markDefs} = focusBlock
      debug(
        'Mixing markDefs of focusBlock and fragments[0] block',
        markDefs,
        fragment[0].markDefs,
      )
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

    const isPasteToEmptyEditor = isEqualToEmptyEditor(
      editor.children,
      schemaTypes,
    )

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
  })

  editor.onChange()
}
