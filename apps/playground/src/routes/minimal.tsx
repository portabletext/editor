import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {createFileRoute} from '@tanstack/react-router'
import {PageNav} from '../page-nav'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
})

export const Route = createFileRoute('/minimal')({
  component: MinimalRoute,
})

function MinimalRoute() {
  return (
    <>
      <header className="flex items-center px-3 md:px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <PageNav />
      </header>
      <main className="flex-1 flex flex-col min-w-0 px-3 md:px-4 py-4">
        <EditorProvider initialConfig={{schemaDefinition}}>
          <PortableTextEditable className="rounded-md border border-gray-200 dark:border-gray-700 outline-none px-2 py-1 min-h-40" />
        </EditorProvider>
      </main>
    </>
  )
}
