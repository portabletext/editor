import {Editor, Path} from 'slate'
import {toPortableTextRange} from '../internal-utils/ranges'
import {selectActionImplementation} from './behavior.action.select'
import type {BehaviorActionImplementation} from './behavior.actions'

export const selectPreviousBlockActionImplementation: BehaviorActionImplementation<
  'select.previous block'
> = ({context, action}) => {
  if (!action.editor.selection) {
    console.error('Unable to select previous block without a selection')
    return
  }

  const blockPath = action.editor.selection.focus.path.slice(0, 1)

  if (!Path.hasPrevious(blockPath)) {
    console.error("There's no previous block to select")
    return
  }

  const position =
    action.select === 'end'
      ? Editor.end(action.editor, Path.previous(blockPath))
      : Editor.start(action.editor, Path.previous(blockPath))

  const newSelection = toPortableTextRange(
    action.editor.children,
    {
      anchor: position,
      focus: position,
    },
    context.schema,
  )

  if (!newSelection) {
    console.error('Could not find selection for previous block')
    return
  }

  selectActionImplementation({
    context,
    action: {
      type: 'select',
      selection: newSelection,
      editor: action.editor,
    },
  })
}
