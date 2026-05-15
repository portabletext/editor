import type {PortableTextBlock} from '@portabletext/editor'
import {EditorProvider} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
import type {Patch} from '@portabletext/patches'
import {useCallback, useRef, useState} from 'react'
import {PilcrowEditor} from './editor'
import {Inspector, type PatchEntry} from './inspector'
import {schemaDefinition} from './schema'
import {starterDocument} from './starter-document'
import {ThemeToggle} from './theme-toggle'

export function App() {
  // Patches are event-driven, not state. We keep a rolling buffer so the
  // Patches panel can show recent activity. The value lives entirely
  // inside the editor machine; the inspector reads it via \`useEditorSelector\`
  // which is per-consumer-subscribed and doesn't bounce through React state.
  const [patches, setPatches] = useState<Array<PatchEntry>>([])
  const patchCounter = useRef(0)
  const onPatch = useCallback((patch: Patch) => {
    const entry: PatchEntry = {id: patchCounter.current++, patch}
    setPatches((current) => {
      const nextEntries = current.concat(entry)
      return nextEntries.length > 200
        ? nextEntries.slice(nextEntries.length - 200)
        : nextEntries
    })
  }, [])
  const onEditorEvent = useCallback(
    (event: {type: string; patch?: Patch}) => {
      if (event.type === 'patch' && event.patch) {
        onPatch(event.patch)
      }
    },
    [onPatch],
  )
  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition,
        initialValue: starterDocument satisfies Array<PortableTextBlock>,
      }}
    >
      <EventListenerPlugin on={onEditorEvent} />
      <main className="pc-shell">
        <section className="pc-pane pc-pane-editor">
          <header className="pc-header">
            <span className="pc-logo" role="img" aria-label="Pilcrow">
              ¶
            </span>
            <span className="pc-header-title">Pilcrow</span>
            <div className="pc-header-actions">
              <ThemeToggle />
            </div>
          </header>
          <PilcrowEditor />
        </section>
        <Inspector patches={patches} />
      </main>
    </EditorProvider>
  )
}
