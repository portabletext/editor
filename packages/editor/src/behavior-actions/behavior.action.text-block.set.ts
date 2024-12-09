import {Transforms} from 'slate'
import {toSlateRange} from '../utils/ranges'
import type {BehaviorActionImplementation} from './behavior.actions'

export const textBlockSetActionImplementation: BehaviorActionImplementation<
  'text block.set'
> = ({action}) => {
  const at = toSlateRange(
    {
      anchor: {path: action.at, offset: 0},
      focus: {path: action.at, offset: 0},
    },
    action.editor,
  )!

  Transforms.setNodes(
    action.editor,
    {
      ...(action.style ? {style: action.style} : {}),
      ...(action.listItem ? {listItem: action.listItem} : {}),
      ...(action.level ? {level: action.level} : {}),
    },
    {at},
  )
}
