import {useEditor} from '@portabletext/editor'
import {
  withYjs,
  type YjsEditor,
  type YjsOperationEntry,
} from '@portabletext/editor/yjs'
import {useEffect, useRef} from 'react'
import {useLatencySharedRoot} from './yjs-latency-provider'
import {useYjsOperationLog} from './yjs-operation-log'

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
}: {
  enabled: boolean
  editorIndex: number
}) {
  const editor = useEditor()
  const sharedRoot = useLatencySharedRoot(editorIndex)
  const yjsEditorRef = useRef<YjsEditor | null>(null)
  const {addEntry} = useYjsOperationLog()
  const addEntryRef = useRef(addEntry)
  addEntryRef.current = addEntry

  useEffect(() => {
    const slateEditor = getSlateEditor(editor)
    if (!slateEditor) return

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
