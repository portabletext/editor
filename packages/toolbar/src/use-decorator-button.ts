import {useEditor, useEditorSelector} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'
import type {ToolbarDecoratorDefinition} from './toolbar-schema-definition'
import {useDecoratorKeyboardShortcut} from './use-decorator-keyboard-shortcut'
import {useMutuallyExclusiveDecorator} from './use-mutually-exclusive-decorator'

/**
 * @beta
 */
export function useDecoratorButton(props: {
  definition: ToolbarDecoratorDefinition
}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.definition.name),
  )
  const onToggle = useCallback(() => {
    editor.send({
      type: 'decorator.toggle',
      decorator: props.definition.name,
    })
    editor.send({type: 'focus'})
  }, [editor, props.definition.name])

  useDecoratorKeyboardShortcut(props)
  useMutuallyExclusiveDecorator(props)

  return {disabled, active, onToggle}
}
