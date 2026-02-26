import {useEditor} from '@portabletext/editor'
import {withYjs, type YjsEditor} from '@portabletext/editor/yjs'
import {createContext, useContext, useEffect, useRef, useState} from 'react'
import * as Y from 'yjs'

const YjsContext = createContext<Y.XmlText | null>(null)

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

export function PlaygroundYjsPlugin({enabled}: {enabled: boolean}) {
  const editor = useEditor()
  const sharedRoot = useContext(YjsContext)
  const yjsEditorRef = useRef<YjsEditor | null>(null)

  useEffect(() => {
    if (!sharedRoot) return

    const slateEditor = getSlateEditor(editor)
    if (!slateEditor) return

    if (!yjsEditorRef.current) {
      const yjsEditor = withYjs(slateEditor, {
        sharedRoot,
        localOrigin: Symbol('playground-local'),
      }) as unknown as YjsEditor
      yjsEditorRef.current = yjsEditor
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
