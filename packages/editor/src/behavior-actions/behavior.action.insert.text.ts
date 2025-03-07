import type {BehaviorActionImplementation} from './behavior.actions'

export const insertTextActionImplementation: BehaviorActionImplementation<
  'insert.text'
> = ({action}) => {
  action.editor.insertText(action.text)
}
