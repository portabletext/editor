import {Transforms} from 'slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertTextActionImplementation: BehaviorActionImplementation<
  'insert.text'
> = ({action}) => {
  if (action.editor.marks) {
    Transforms.insertNodes(action.editor, {
      text: action.text,
      ...action.editor.marks,
    })
  } else {
    Transforms.insertText(action.editor, action.text)
  }

  action.editor.marks = null
}
