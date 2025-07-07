import {useEditor, useEditorSelector} from '@portabletext/editor'
import type {InsertPlacement} from '@portabletext/editor/behaviors'
import {useCallback} from 'react'
import type {ToolbarBlockObjectSchemaType} from './use-toolbar-schema'

/**
 * @beta
 */
export function useBlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const onInsert = useCallback(
    ({
      value,
      placement,
    }: {
      value: {[key: string]: unknown}
      placement: InsertPlacement | undefined
    }) => {
      editor.send({
        type: 'insert.block object',
        blockObject: {
          name: props.schemaType.name,
          value,
        },
        placement: placement ?? 'auto',
      })
      editor.send({type: 'focus'})
    },
    [editor, props.schemaType.name],
  )

  return {disabled, onInsert}
}
