import {isEqual, uniq} from 'lodash'
import {Editor, Transforms} from 'slate'
import {isEqualToEmptyEditor, toSlateValue} from '../internal-utils/values'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlocksActionImplementation: BehaviorActionImplementation<
  'insert.blocks'
> = ({context, action}) => {
  const fragment = toSlateValue(action.blocks, {schemaTypes: context.schema})

  if (!action.editor.selection) {
    if (action.placement === 'before') {
      action.editor.insertFragment(fragment, {
        at: Editor.start(action.editor, []),
      })
      return
    }

    if (action.placement === 'after') {
      action.editor.insertFragment(fragment, {
        at: Editor.end(action.editor, []),
      })
      return
    }

    action.editor.insertFragment(fragment)
    return
  }

  const [focusBlock, focusPath] = Editor.node(
    action.editor,
    action.editor.selection,
    {
      depth: 1,
    },
  )

  if (action.placement === 'before' && focusPath) {
    Transforms.insertNodes(action.editor, fragment, {at: focusPath})
    return
  }

  if (action.placement === 'after' && focusPath) {
    const nextPath = [focusPath[0] + 1]
    Transforms.insertNodes(action.editor, fragment, {at: nextPath})
    Transforms.select(action.editor, {
      anchor: {path: [nextPath[0], 0], offset: 0},
      focus: {path: [nextPath[0], 0], offset: 0},
    })
    return
  }

  // Ensure that markDefs for any annotations inside this fragment are copied over to the focused text block.
  if (
    action.editor.isTextBlock(focusBlock) &&
    action.editor.isTextBlock(fragment[0])
  ) {
    const {markDefs} = focusBlock
    if (!isEqual(markDefs, fragment[0].markDefs)) {
      Transforms.setNodes(
        action.editor,
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
    action.editor.children,
    context.schema,
  )

  if (isPasteToEmptyEditor) {
    // Special case for pasting directly into an empty editor (a placeholder block).
    // When pasting content starting with multiple empty blocks,
    // `editor.insertFragment` can potentially duplicate the keys of
    // the placeholder block because of operations that happen
    // inside `editor.insertFragment` (involves an `insert_node` operation).
    // However by splitting the placeholder block first in this situation we are good.
    Transforms.splitNodes(action.editor, {at: [0, 0]})
    action.editor.insertFragment(fragment)
    Transforms.removeNodes(action.editor, {at: [0]})
  } else {
    // All other inserts
    action.editor.insertFragment(fragment)
  }
}
