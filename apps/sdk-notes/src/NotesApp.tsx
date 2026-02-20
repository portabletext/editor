import {useState} from 'react'
import {NoteEditor} from './NoteEditor.tsx'
import {NoteList} from './NoteList.tsx'

export function NotesApp() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  return (
    <div className="flex h-screen">
      <aside className="w-72 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <header className="border-b border-gray-200 p-4">
          <h1 className="text-lg font-semibold">Notes</h1>
        </header>
        <NoteList
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
        />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedNoteId ? (
          <NoteEditor key={selectedNoteId} documentId={selectedNoteId} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            Select a note to start editing
          </div>
        )}
      </main>
    </div>
  )
}
