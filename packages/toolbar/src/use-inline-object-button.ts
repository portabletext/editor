import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useCallback} from 'react'
import type {ToolbarInlineObjectDefinition} from './toolbar-schema-definition'

/**
 * @beta
 */
export function useInlineObjectButton(props: {
  definition: ToolbarInlineObjectDefinition
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
