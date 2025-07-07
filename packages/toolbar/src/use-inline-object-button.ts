import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useCallback} from 'react'
import type {ToolbarInlineObjectSchemaType} from './use-toolbar-schema'

/**
 * @beta
 */
export function useInlineObjectButton(props: {
  schemaType: ToolbarInlineObjectSchemaType
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
          name: props.schemaType.name,
          value,
        },
      })
      editor.send({type: 'focus'})
    },
    [editor, props.schemaType.name],
  )

  return {disabled, onInsert}
}
