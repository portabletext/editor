import React, {useMemo} from 'react'
import {Slate} from 'slate-react'
import {Synchronizer} from './components/Synchronizer'
import {EditorActorContext} from './editor-actor-context'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {
  PortableTextEditor,
  RouteEventsToChanges,
  type PortableTextEditorProps,
} from './PortableTextEditor'
import {useEditor, type Editor, type EditorConfig} from './use-editor'

const EditorContext = React.createContext<Editor | undefined>(undefined)

/**
 * @alpha
 */
export type EditorProviderProps = {
  initialConfig: EditorConfig
  children?: React.ReactNode
}

/**
 * @alpha
 */
export function EditorProvider(props: EditorProviderProps) {
  const editor = useEditor(props.initialConfig)
  const editorActor = editor._internal.editorActor
  const slateEditor = editor._internal.slateEditor
  const editable = editor._internal.editable
  const portableTextEditor = useMemo(
    () =>
      new PortableTextEditor({
        editor,
      } as unknown as PortableTextEditorProps),
    [editor],
  )

  return (
    <EditorContext.Provider value={editor}>
      <RouteEventsToChanges
        editorActor={editorActor}
        onChange={(change) => {
          portableTextEditor.change$.next(change)
        }}
      />
      <Synchronizer
        editorActor={editorActor}
        getValue={editable.getValue}
        portableTextEditor={portableTextEditor}
        slateEditor={slateEditor.instance}
      />
      <EditorActorContext.Provider value={editorActor}>
        <Slate
          editor={slateEditor.instance}
          initialValue={slateEditor.initialValue}
        >
          <PortableTextEditorContext.Provider value={portableTextEditor}>
            <PortableTextEditorSelectionProvider editorActor={editorActor}>
              {props.children}
            </PortableTextEditorSelectionProvider>
          </PortableTextEditorContext.Provider>
        </Slate>
      </EditorActorContext.Provider>
    </EditorContext.Provider>
  )
}

/**
 * @alpha
 */
export function useEditorContext() {
  const editor = React.useContext(EditorContext)

  if (!editor) {
    throw new Error('No Editor set. Use EditorProvider to set one.')
  }

  return editor
}
