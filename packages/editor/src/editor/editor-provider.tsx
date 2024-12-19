import React, {useMemo} from 'react'
import {Slate} from 'slate-react'
import {Synchronizer} from './components/Synchronizer'
import {useCreateEditor, type Editor, type EditorConfig} from './create-editor'
import {EditorActorContext} from './editor-actor-context'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {
  PortableTextEditor,
  RouteEventsToChanges,
  type PortableTextEditorProps,
} from './PortableTextEditor'

const EditorContext = React.createContext<Editor | undefined>(undefined)

/**
 * @public
 */
export type EditorProviderProps = {
  initialConfig: EditorConfig
  children?: React.ReactNode
}

/**
 * @public
 */
export function EditorProvider(props: EditorProviderProps) {
  const editor = useCreateEditor(props.initialConfig)
  const editorActor = editor._internal.editorActor
  const slateEditor = editor._internal.slateEditor
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
 * @public
 */
export function useEditor() {
  const editor = React.useContext(EditorContext)

  if (!editor) {
    throw new Error('No Editor set. Use EditorProvider to set one.')
  }

  return editor
}
