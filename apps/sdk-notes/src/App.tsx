import {SanityApp} from '@sanity/sdk-react'
import {NotesApp} from './NotesApp.tsx'

const config = {projectId: 'q444gl2w', dataset: 'production'}

export function App() {
  return (
    <SanityApp config={config} fallback={<Loading />}>
      <NotesApp />
    </SanityApp>
  )
}

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center text-gray-500">
      Connecting to Sanity…
    </div>
  )
}
