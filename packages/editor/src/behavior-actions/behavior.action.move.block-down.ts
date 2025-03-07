import {Path} from 'slate'
import {toSlatePath} from '../internal-utils/paths'
import {toPortableTextRange} from '../internal-utils/ranges'
import {isKeyedSegment} from '../utils'
import {moveBlockActionImplementation} from './behavior.action.move.block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const moveBlockDownActionImplementation: BehaviorActionImplementation<
  'move.block down'
> = ({context, action}) => {
  const at = [toSlatePath(action.at, action.editor)[0]]
  const to = [Path.next(at)[0]]
  const selection = toPortableTextRange(
    action.editor.children,
    {
      anchor: {
        path: to,
        offset: 0,
      },
      focus: {
        path: to,
        offset: 0,
      },
    },
    context.schema,
  )

  const destinationBlockKey = selection
    ? isKeyedSegment(selection.focus.path[0])
      ? selection.focus.path[0]._key
      : undefined
    : undefined

  if (destinationBlockKey === undefined) {
    console.error('Could not find destination block key')
    return
  }

  moveBlockActionImplementation({
    context,
    action: {
      type: 'move.block',
      at: action.at,
      to: [{_key: destinationBlockKey}],
      editor: action.editor,
    },
  })
}
