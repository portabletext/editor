import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'
import {useDecoratorKeyboardShortcut} from './use-decorator-keyboard-shortcut'
import {useMutuallyExclusiveDecorator} from './use-mutually-exclusive-decorator'
import type {ToolbarDecoratorSchemaType} from './use-toolbar-schema'

/**
 * @beta
 */
export function useDecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.schemaType.name),
  )
  const onToggle = useCallback(() => {
    editor.send({
      type: 'decorator.toggle',
      decorator: props.schemaType.name,
    })
    editor.send({type: 'focus'})
  }, [editor, props.schemaType.name])

  useDecoratorKeyboardShortcut(props)
  useMutuallyExclusiveDecorator(props)

  return {disabled, active, onToggle}
}
