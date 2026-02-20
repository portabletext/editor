import type {DocumentHandle} from '@sanity/sdk'
import {
  createDocument,
  createDocumentHandle,
  useApplyDocumentActions,
  useDocumentPreview,
  useDocuments,
} from '@sanity/sdk-react'
import {Suspense} from 'react'

interface NoteListProps {
  selectedNoteId: string | null
  onSelectNote: (id: string) => void
}

export function NoteList(props: NoteListProps) {
  return (
    <Suspense
      fallback={<div className="p-4 text-sm text-gray-400">Loading notes…</div>}
    >
      <NoteListInner {...props} />
    </Suspense>
  )
}

function NoteListInner({selectedNoteId, onSelectNote}: NoteListProps) {
  const {data: notes, isPending} = useDocuments({
    documentType: 'note',
    orderings: [{field: '_updatedAt', direction: 'desc'}],
  })
  const apply = useApplyDocumentActions()

  async function handleCreateNote() {
    const handle = createDocumentHandle({
      documentId: crypto.randomUUID(),
      documentType: 'note',
    })
    await apply(createDocument(handle))
    onSelectNote(handle.documentId)
  }

  return (
    <>
      <div className="p-3 border-b border-gray-200">
        <button
          type="button"
          onClick={handleCreateNote}
          className="w-full rounded bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600 transition-colors"
        >
          New note
        </button>
      </div>
      {isPending && notes.length === 0 ? (
        <div className="p-4 text-sm text-gray-400">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="p-4 text-sm text-gray-400">No notes yet</div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {notes.map((note) => (
            <li key={note.documentId}>
              <Suspense
                fallback={
                  <NoteListItemFallback
                    documentId={note.documentId}
                    isSelected={selectedNoteId === note.documentId}
                    onSelect={() => onSelectNote(note.documentId)}
                  />
                }
              >
                <NoteListItem
                  handle={note}
                  isSelected={selectedNoteId === note.documentId}
                  onSelect={() => onSelectNote(note.documentId)}
                />
              </Suspense>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function NoteListItem({
  handle,
  isSelected,
  onSelect,
}: {
  handle: DocumentHandle
  isSelected: boolean
  onSelect: () => void
}) {
  const {data: preview} = useDocumentPreview(handle)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="font-medium text-sm truncate">
        {preview.title || 'Untitled'}
      </div>
    </button>
  )
}

function NoteListItemFallback({
  documentId,
  isSelected,
  onSelect,
}: {
  documentId: string
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
      }`}
    >
      <div className="font-medium text-sm truncate text-gray-400">
        {documentId.slice(0, 8)}…
      </div>
    </button>
  )
}
