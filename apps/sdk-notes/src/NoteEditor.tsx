import {
  EditorProvider,
  PortableTextEditable,
  type RenderDecoratorFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import {SDKValuePlugin} from '@portabletext/plugin-sdk-value'
import {defineSchema} from '@portabletext/schema'
import {useDocument, useEditDocument} from '@sanity/sdk-react'
import {Suspense, useCallback, useMemo} from 'react'

const schemaDefinition = defineSchema({})

interface NoteEditorProps {
  documentId: string
}

export function NoteEditor({documentId}: NoteEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-gray-400">
          Loading editor…
        </div>
      }
    >
      <NoteEditorInner documentId={documentId} />
    </Suspense>
  )
}

function NoteEditorInner({documentId}: NoteEditorProps) {
  const {data: title} = useDocument<string>({
    documentId,
    documentType: 'note',
    path: 'title',
  })

  const setTitle = useEditDocument<string>({
    documentId,
    documentType: 'note',
    path: 'title',
  })

  const keyGenerator = useMemo(() => {
    let key = 0
    return () => `k${key++}`
  }, [])

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value)
    },
    [setTitle],
  )

  const renderStyle: RenderStyleFunction = useCallback((props) => {
    switch (props.value) {
      case 'h1':
        return <h1 className="text-3xl font-bold my-4">{props.children}</h1>
      case 'h2':
        return <h2 className="text-2xl font-bold my-3">{props.children}</h2>
      case 'h3':
        return <h3 className="text-xl font-bold my-2">{props.children}</h3>
      case 'h4':
        return <h4 className="text-lg font-bold my-2">{props.children}</h4>
      case 'blockquote':
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
            {props.children}
          </blockquote>
        )
      default:
        return <p className="my-1 leading-relaxed">{props.children}</p>
    }
  }, [])

  const renderDecorator: RenderDecoratorFunction = useCallback((props) => {
    switch (props.value) {
      case 'strong':
        return <strong>{props.children}</strong>
      case 'em':
        return <em>{props.children}</em>
      case 'underline':
        return <u>{props.children}</u>
      case 'code':
        return (
          <code className="bg-gray-100 px-1 rounded text-sm font-mono">
            {props.children}
          </code>
        )
      default:
        return <span>{props.children}</span>
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <input
          type="text"
          placeholder="Untitled"
          value={title ?? ''}
          onChange={handleTitleChange}
          className="w-full text-2xl font-bold outline-none border-none bg-transparent mb-4 placeholder:text-gray-300"
        />
        <EditorProvider
          initialConfig={{
            schemaDefinition,
            keyGenerator,
          }}
        >
          <SDKValuePlugin
            documentId={documentId}
            documentType="note"
            path="body"
          />
          <PortableTextEditable
            className="outline-none min-h-[300px]"
            renderStyle={renderStyle}
            renderDecorator={renderDecorator}
          />
        </EditorProvider>
      </div>
    </div>
  )
}
