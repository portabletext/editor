import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useCallback} from 'react'

export function useHistoryButtons() {
  const editor = useEditor()
  const disabled = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.readOnly,
  )
  const onUndo = useCallback(() => {
    editor.send({type: 'history.undo'})
    editor.send({type: 'focus'})
  }, [editor])
  const onRedo = useCallback(() => {
    editor.send({type: 'history.redo'})
    editor.send({type: 'focus'})
  }, [editor])

  return {disabled, onUndo, onRedo}
}
