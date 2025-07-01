import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'
import type {ToolbarListDefinition} from './toolbar-schema-definition'

/**
 * @beta
 */
export function useListButton(props: {definition: ToolbarListDefinition}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.definition.name),
  )
  const onToggle = useCallback(() => {
    editor.send({
      type: 'list item.toggle',
      listItem: props.definition.name,
    })
    editor.send({type: 'focus'})
  }, [editor, props.definition.name])

  return {disabled, active, onToggle}
}
