import {
  useEditor,
  useEditorSelector,
  type DecoratorDefinition,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import type {KeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useCallback} from 'react'
import {useDecoratorKeyboardShortcut} from './use-decorator-keyboard-shortcut'
import {useMutuallyExclusiveDecorator} from './use-mutually-exclusive-decorator'

/**
 * @beta
 */
export function useDecoratorButton(props: {
  definition: DecoratorDefinition & {
    shortcut?: KeyboardShortcut
    mutuallyExclusive?: ReadonlyArray<DecoratorDefinition['name']>
  }
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
