import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'
import type {ToolbarListSchemaType} from './use-toolbar-schema'

/**
 * @beta
 */
export function useListButton(props: {schemaType: ToolbarListSchemaType}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.schemaType.name),
  )
  const onToggle = useCallback(() => {
    editor.send({
      type: 'list item.toggle',
      listItem: props.schemaType.name,
    })
    editor.send({type: 'focus'})
  }, [editor, props.schemaType.name])

  return {disabled, active, onToggle}
}
