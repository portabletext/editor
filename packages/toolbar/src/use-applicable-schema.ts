import {useEditor, useEditorSelector} from '@portabletext/editor'
import {
  compareApplicableSchema,
  getApplicableSchema,
  type ApplicableSchema,
} from '@portabletext/editor/selectors'

export type {ApplicableSchema}

/**
 * @beta
 *
 * React hook that subscribes to {@link getApplicableSchema} for the active
 * editor and returns a stable reference across editor ticks while the
 * applicable set is unchanged.
 *
 * Pair with {@link useToolbarSchema} to render a static toolbar whose
 * buttons stay stable across selection moves and gate their enabled state
 * on whether the corresponding name is in the relevant set.
 */
export function useApplicableSchema(): ApplicableSchema {
  const editor = useEditor()
  return useEditorSelector(editor, getApplicableSchema, compareApplicableSchema)
}
