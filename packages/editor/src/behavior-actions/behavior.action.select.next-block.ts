import {toPortableTextRange} from '../internal-utils/ranges'
import {selectActionImplementation} from './behavior.action.select'
import type {BehaviorActionImplementation} from './behavior.actions'

export const selectNextBlockActionImplementation: BehaviorActionImplementation<
  'select.next block'
> = ({context, action}) => {
  if (!action.editor.selection) {
    console.error('Unable to select previous block without a selection')
    return
  }

  const blockPath = action.editor.selection.focus.path.slice(0, 1)
  const nextBlockPath = [blockPath[0] + 1]

  const newSelection = toPortableTextRange(
    action.editor.children,
    {
      anchor: {
        path: nextBlockPath,
        offset: 0,
      },
      focus: {
        path: nextBlockPath,
        offset: 0,
      },
    },
    context.schema,
  )

  if (!newSelection) {
    console.error('Could not find selection for next block')
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
