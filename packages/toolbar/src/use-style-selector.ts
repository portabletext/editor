import {
  useEditor,
  useEditorSelector,
  type StyleDefinition,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'
import {useStyleKeyboardShortcuts} from './use-style-keyboard-shortcuts'
import type {ToolbarStyleSchemaType} from './use-toolbar-schema'

/**
 * @beta
 */
export function useStyleSelector(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}) {
  const editor = useEditor()
  const activeStyle = useEditorSelector(editor, selectors.getActiveStyle)
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )

  const onToggle = useCallback(
    (style: StyleDefinition['name']) => {
      editor.send({type: 'style.toggle', style})
      editor.send({type: 'focus'})
    },
    [editor],
  )

  useStyleKeyboardShortcuts(props)

  return {activeStyle, disabled, onToggle}
}
