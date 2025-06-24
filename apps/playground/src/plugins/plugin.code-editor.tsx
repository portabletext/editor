import {useEditor} from '@portabletext/editor'
import {useEffect} from 'react'
import {createCodeEditorBehaviors} from './behavior.code-editor'

export function CodeEditorPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const behaviors = createCodeEditorBehaviors({
      moveBlockUpShortcut: 'Alt+ArrowUp',
      moveBlockDownShortcut: 'Alt+ArrowDown',
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
