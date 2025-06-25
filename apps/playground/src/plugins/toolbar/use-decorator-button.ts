import {
  useEditor,
  useEditorSelector,
  type DecoratorDefinition,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'

export function useDecoratorButton(props: {definition: DecoratorDefinition}) {
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

  return {disabled, active, onToggle}
}
