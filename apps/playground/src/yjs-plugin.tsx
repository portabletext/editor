import {useEditor} from '@portabletext/editor'
import {
  withYjs,
  type YjsEditor,
  type YjsOperationEntry,
} from '@portabletext/editor/yjs'
import {createContext, useContext, useEffect, useRef, useState} from 'react'
import * as Y from 'yjs'
import {useLatencySharedRoot} from './yjs-latency-provider'
import {useYjsOperationLog} from './yjs-operation-log'

export const YjsContext = createContext<Y.XmlText | null>(null)

export function YjsProvider({children}: {children: React.ReactNode}) {
  const [yDoc] = useState(() => new Y.Doc())
  const [sharedRoot] = useState(
    () => yDoc.get('content', Y.XmlText) as Y.XmlText,
  )

  useEffect(() => {
    return () => yDoc.destroy()
  }, [yDoc])

  return (
    <YjsContext.Provider value={sharedRoot}>{children}</YjsContext.Provider>
  )
}

function getSlateEditor(
  editor: ReturnType<typeof useEditor>,
): Parameters<typeof withYjs>[0] | null {
  // Access the internal Slate editor instance. This is not part of the public
  // API but is needed for the Yjs spike to apply the `withYjs` plugin.
  const internal = (editor as Record<string, unknown>)._internal as
    | {slateEditor?: {instance?: Parameters<typeof withYjs>[0]}}
    | undefined
  return internal?.slateEditor?.instance ?? null
}

export function PlaygroundYjsPlugin({
  enabled,
  editorIndex,
  useLatency,
}: {
  enabled: boolean
  editorIndex: number
  useLatency: boolean
}) {
  const editor = useEditor()
  const sharedRootFromContext = useContext(YjsContext)
  const latencySharedRoot = useLatencySharedRoot(editorIndex)
  const sharedRoot = useLatency ? latencySharedRoot : sharedRootFromContext
  const yjsEditorRef = useRef<YjsEditor | null>(null)
  const currentSharedRootRef = useRef<Y.XmlText | null>(null)
  const {addEntry} = useYjsOperationLog()
  const addEntryRef = useRef(addEntry)
  addEntryRef.current = addEntry

  useEffect(() => {
    if (!sharedRoot) return

    const slateEditor = getSlateEditor(editor)
    if (!slateEditor) return

    // If the shared root changed (e.g. toggling latency mode), disconnect the
    // old editor and create a new one
    if (yjsEditorRef.current && currentSharedRootRef.current !== sharedRoot) {
      yjsEditorRef.current.disconnect()
      yjsEditorRef.current = null
    }

    if (!yjsEditorRef.current) {
      const onOperation = (entry: YjsOperationEntry) => {
        addEntryRef.current(entry)
      }

      const yjsEditor = withYjs(slateEditor, {
        sharedRoot,
        localOrigin: Symbol('playground-local'),
        onOperation,
      }) as unknown as YjsEditor
      yjsEditorRef.current = yjsEditor
      currentSharedRootRef.current = sharedRoot
    }

    if (enabled) {
      yjsEditorRef.current.connect()
    } else {
      yjsEditorRef.current.disconnect()
    }

    return () => {
      yjsEditorRef.current?.disconnect()
    }
  }, [editor, sharedRoot, enabled])

  return null
}
