import {Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertTextActionImplementation: BehaviorActionImplementation<
  'insert.text'
> = ({action}) => {
  Transforms.insertText(action.editor, action.text)
}
