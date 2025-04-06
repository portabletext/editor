import {insertText} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertSoftBreakActionImplementation: BehaviorActionImplementation<
  'insert.soft break'
> = ({action}) => {
  insertText(action.editor, '\n')
}
