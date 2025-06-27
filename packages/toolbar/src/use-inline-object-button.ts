import {
  useEditor,
  useEditorSelector,
  type InlineObjectDefinition,
} from '@portabletext/editor'
import {useCallback} from 'react'

/**
 * @beta
 */
export function useInlineObjectButton(props: {
  definition: InlineObjectDefinition
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const onInsert = useCallback(
    ({value}: {value: {[key: string]: unknown}}) => {
      editor.send({
        type: 'insert.inline object',
        inlineObject: {
          name: props.definition.name,
          value,
        },
      })
      editor.send({type: 'focus'})
    },
    [editor, props.definition.name],
  )

  return {disabled, onInsert}
}
