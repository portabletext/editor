import {
  useEditor,
  useEditorSelector,
  type DecoratorDefinition,
} from '@portabletext/editor'
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import * as selectors from '@portabletext/editor/selectors'
import {useCallback, useEffect} from 'react'
import type {KeyboardShortcut} from './keyboard-shortcut'

/**
 * @beta
 */
export function useDecoratorButton(props: {
  definition: DecoratorDefinition & {shortcut?: KeyboardShortcut}
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

  useEffect(() => {
    const shortcut = props.definition.shortcut

    if (!shortcut) {
      return
    }

    return editor.registerBehavior({
      behavior: defineBehavior({
        on: 'keyboard.keydown',
        guard: ({event}) => shortcut.guard(event.originEvent),
        actions: [
          () => [
            raise({
              type: 'decorator.toggle',
              decorator: props.definition.name,
            }),
          ],
        ],
      }),
    })
  }, [editor, props.definition.name, props.definition.shortcut])

  return {disabled, active, onToggle}
}
