import {defineSchema, EditorProvider} from '@portabletext/editor'
import {MarkdownEditor} from './MarkdownEditor.tsx'

const schemaDefinition = defineSchema({
  styles: [{name: 'h1'}, {name: 'h2'}, {name: 'h3'}, {name: 'h4'}, {name: 'h5'}, {name: 'h6'}],
})

export function App() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-stone-800 mb-1">
          Markdown Editor
        </h1>
        <p className="text-sm text-stone-500 mb-6">
          Type markdown syntax directly. Formatting appears as you type.
        </p>
        <EditorProvider initialConfig={{schemaDefinition}}>
          <MarkdownEditor />
        </EditorProvider>
      </div>
    </div>
  )
}
