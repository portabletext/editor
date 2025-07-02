import {useEditor} from '@portabletext/editor'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'
import {useEffect} from 'react'
import {createCodeEditorBehaviors} from './behavior.code-editor'

export function CodeEditorPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createCodeEditorBehaviors({
      moveBlockUpShortcut: createKeyboardShortcut({
        default: [
          {
            key: 'ArrowUp',
            alt: true,
            ctrl: false,
            meta: false,
            shift: false,
          },
        ],
      }),
      moveBlockDownShortcut: createKeyboardShortcut({
        default: [
          {
            key: 'ArrowDown',
            alt: true,
            ctrl: false,
            meta: false,
            shift: false,
          },
        ],
      }),
    })

    const unregisterBehaviors = behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}
