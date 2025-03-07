import {ReactEditor} from 'slate-react'
import type {BehaviorActionImplementation} from './behavior.actions'

export const blurActionImplementation: BehaviorActionImplementation<'blur'> = ({
  action,
}) => {
  ReactEditor.blur(action.editor)
}
