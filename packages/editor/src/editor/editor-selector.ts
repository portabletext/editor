import {useSelector} from '@xstate/react'
import type {EditorContext, EditorState} from './behavior/behavior.types'
import type {Editor} from './create-editor'
import {getValue} from './get-value'

function defaultCompare<T>(a: T, b: T) {
  return a === b
}

/**
 * @alpha
 */
export type SelectorEditorState = {
  value: EditorState['value']
  selection?: EditorState['selection']
}

/**
 * @alpha
 */
export type EditorSelector<TSelected> = ({
  context,
  state,
}: {
  context: EditorContext
  state: SelectorEditorState
}) => TSelected

/**
 * @alpha
 */
export function useEditorSelector<TSelected>(
  editor: Editor,
  selector: EditorSelector<TSelected>,
  compare: (a: TSelected, b: TSelected) => boolean = defaultCompare,
) {
  return useSelector(
    editor._internal.editorActor,
    (snapshot) => {
      const context = {
        keyGenerator: snapshot.context.keyGenerator,
        schema: snapshot.context.schema,
      }
      const state = {
        value: getValue(editor),
        selection: snapshot.context.selection,
      }

      return selector({context, state})
    },
    compare,
  )
}
