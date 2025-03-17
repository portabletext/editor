import React, {useMemo} from 'react'
import {Slate} from 'slate-react'
import {Synchronizer} from './components/Synchronizer'
import {
  useCreateInternalEditor,
  type Editor,
  type EditorConfig,
} from './create-editor'
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
 * The EditorProvider component is used to set up the editor context and configure the Portable Text Editor.
 * @example
 * ```tsx
 * import {EditorProvider} from '@portabletext/editor'
 *
 * function App() {
 *  return (
 *    <EditorProvider initialConfig={{ ... }} >
 *      ...
 *    </EditorProvider>
 *  )
 * }
 *
 * ```
 * @group Components
 */
export function EditorProvider(props: EditorProviderProps) {
  const internalEditor = useCreateInternalEditor(props.initialConfig)
  const editorActor = internalEditor._internal.editorActor
  const slateEditor = internalEditor._internal.slateEditor
  const portableTextEditor = useMemo(
    () =>
      new PortableTextEditor({
        editor: internalEditor,
      } as unknown as PortableTextEditorProps),
    [internalEditor],
  )

  return (
    <EditorContext.Provider value={internalEditor}>
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
 * Get the current editor context from the `EditorProvider`.
 * Must be used inside the `EditorProvider` component.
 * @returns The current editor object.
 * @example
 * ```tsx
 * import { useEditor } from '@portabletext/editor'
 *
 * function MyComponent() {
 *  const editor = useEditor()
 * }
 * ```
 * @group Hooks
 */
export function useEditor() {
  const editor = React.useContext(EditorContext)

  if (!editor) {
    throw new Error('No Editor set. Use EditorProvider to set one.')
  }

  return editor
}
