import React, {useMemo} from 'react'
import {Slate} from 'slate-react'
import {compileType} from '../utils/schema'
import {Synchronizer} from './components/Synchronizer'
import type {Editor} from './create-editor'
import {compileSchemaDefinition} from './define-schema'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {createEditableAPI} from './plugins/createWithEditableAPI'
import {PortableTextEditor, RouteEventsToChanges} from './PortableTextEditor'

const EditorContext = React.createContext<Editor | undefined>(undefined)

/**
 * @alpha
 */
export function useEditor() {
  const editor = React.useContext(EditorContext)

  if (!editor) {
    throw new Error('No Editor set. Use EditorProvider to set one.')
  }

  return editor
}

/**
 * @alpha
 */
export type EditorProviderProps = {
  editor: Editor
  portableTextEditor?: PortableTextEditor
  children?: React.ReactNode
}

/**
 * @alpha
 */
export function EditorProvider(props: EditorProviderProps) {
  React.useEffect(() => {
    props.editor._internal.editorActor.start()
  }, [props.editor])

  const editable = useMemo(
    () =>
      createEditableAPI(
        props.editor._internal.slateEditor.instance,
        props.editor._internal.editorActor,
      ),
    [props.editor],
  )

  const portableTextEditor = useMemo(() => {
    if (props.portableTextEditor) {
      return props.portableTextEditor
    }

    const portableTextEditor = new PortableTextEditor({
      // @ts-ignore
      legacyMode: true,
      schemaType: props.editor._internal.schemaDefinition
        ? compileSchemaDefinition(props.editor._internal.schemaDefinition)
            .schema
        : props.editor._internal.schema.hasOwnProperty('jsonType')
          ? props.editor._internal.schema
          : compileType(props.editor._internal.schema),
    })
    portableTextEditor.setEditable(editable)

    return portableTextEditor
  }, [editable, props.editor, props.portableTextEditor])

  return (
    <>
      <RouteEventsToChanges
        editor={props.editor}
        onChange={(change) => {
          /**
           * For backwards compatibility, we relay all changes to the
           * `change$` Subject as well.
           */
          portableTextEditor.change$.next(change)
        }}
      />
      <EditorContext.Provider value={props.editor}>
        <Slate
          editor={props.editor._internal.slateEditor.instance}
          // initialValue={[]}
          initialValue={props.editor._internal.slateEditor.initialValue}
        >
          <PortableTextEditorContext.Provider value={portableTextEditor}>
            <PortableTextEditorSelectionProvider editor={props.editor}>
              {props.children}
              <Synchronizer
                editor={props.editor}
                getValue={editable.getValue}
                portableTextEditor={portableTextEditor}
              />
            </PortableTextEditorSelectionProvider>
          </PortableTextEditorContext.Provider>
        </Slate>
      </EditorContext.Provider>
    </>
  )
}
