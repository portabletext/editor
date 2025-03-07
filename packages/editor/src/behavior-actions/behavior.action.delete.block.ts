import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteBlockActionImplementation: BehaviorActionImplementation<
  'delete.block'
> = ({action}) => {
  const range = toSlateRange(
    {
      anchor: {path: action.blockPath, offset: 0},
      focus: {path: action.blockPath, offset: 0},
    },
    action.editor,
  )

  if (!range) {
    console.error('Unable to find Slate range from selection points')
    return
  }

  Transforms.removeNodes(action.editor, {
    at: range,
  })
}
