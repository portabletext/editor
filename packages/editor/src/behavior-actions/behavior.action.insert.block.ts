import {Editor, Transforms, type Descendant} from 'slate'
import type {EditorSchema} from '../editor/define-schema'
import {parseBlock} from '../internal-utils/parse-blocks'
import {isEqualToEmptyEditor, toSlateValue} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockActionImplementation: BehaviorActionImplementation<
  'insert.block'
> = ({context, action}) => {
  const parsedBlock = parseBlock({
    block: action.block,
    context,
    options: {refreshKeys: false},
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${JSON.stringify(action.block)}`)
  }

  const fragment = toSlateValue([parsedBlock], {schemaTypes: context.schema})[0]

  if (!fragment) {
    throw new Error(
      `Failed to convert block to Slate fragment ${JSON.stringify(parsedBlock)}`,
    )
  }

  insertBlock({
    block: fragment,
    placement: action.placement,
    editor: action.editor,
    schema: context.schema,
  })
}

function insertBlock({
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

      Transforms.insertNodes(editor, [block], {at: nextPath})
    } else if (placement === 'before') {
      Transforms.insertNodes(editor, [block], {at: focusBlockPath})
    } else {
      if (editor.isTextBlock(focusBlock) && editor.isTextBlock(block)) {
        const currentSelection = editor.selection
        Transforms.insertFragment(editor, [block])
        Transforms.select(editor, currentSelection)
      } else {
        Transforms.insertNodes(editor, [block])
      }

      if (focusBlock && isEqualToEmptyEditor([focusBlock], schema)) {
        Transforms.removeNodes(editor, {at: focusBlockPath})
      }
    }
  }
}
