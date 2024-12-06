import {useSelector} from '@xstate/react'
import type {EditorSelection} from '../types/editor'
import type {Editor} from './create-editor'
import type {EditorSnapshot} from './editor-snapshot'
import {getValue} from './get-value'

function defaultCompare<T>(a: T, b: T) {
  return a === b
}

/**
 * @alpha
 */
export type EditorSelectorSnapshot = {
  context: Omit<EditorSnapshot['context'], 'selection'> & {
    selection?: NonNullable<EditorSelection>
  }
}

/**
 * @alpha
 */
export type EditorSelector<TSelected> = (
  snapshot: EditorSelectorSnapshot,
) => TSelected

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
        selection: snapshot.context.selection,
        value: getValue(editor),
      }

      return selector({context})
    },
    compare,
  )
}
