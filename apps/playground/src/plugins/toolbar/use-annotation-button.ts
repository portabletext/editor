import {
  useEditor,
  useEditorSelector,
  type AnnotationDefinition,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback} from 'react'

export function useAnnotationButton(props: {definition: AnnotationDefinition}) {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.definition.name),
  )
  const onAdd = useCallback(
    ({value}: {value: {[key: string]: unknown}}) => {
      editor.send({
        type: 'annotation.add',
        annotation: {
          name: props.definition.name,
          value,
        },
      })
      editor.send({type: 'focus'})
    },
    [editor, props.definition.name],
  )
  const onRemove = useCallback(() => {
    editor.send({
      type: 'annotation.remove',
      annotation: {
        name: props.definition.name,
      },
    })
    editor.send({type: 'focus'})
  }, [editor, props.definition.name])

  return {disabled, active, onAdd, onRemove}
}
