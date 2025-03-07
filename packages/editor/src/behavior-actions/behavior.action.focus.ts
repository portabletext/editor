import {ReactEditor} from 'slate-react'
import type {BehaviorActionImplementation} from './behavior.actions'

export const focusActionImplementation: BehaviorActionImplementation<
  'focus'
> = ({action}) => {
  ReactEditor.focus(action.editor)
}
