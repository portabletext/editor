import React from 'react'
import type {Editor} from '../editor'
import {useEditor} from '../editor/use-editor'

/**
 * @public
 */
export const EditorRefPlugin = React.forwardRef<Editor | null>((_, ref) => {
  const editor = useEditor()

  const portableTextEditorRef = React.useRef(editor)

  React.useImperativeHandle(ref, () => portableTextEditorRef.current, [])

  return null
})
EditorRefPlugin.displayName = 'EditorRefPlugin'
