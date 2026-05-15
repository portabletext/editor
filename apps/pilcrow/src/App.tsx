import {EditorProvider, keyGenerator} from '@portabletext/editor'
import {PilcrowEditor} from './editor'
import {pilcrowSchema} from './schema'
import {starterDocument} from './starter-document'

export function App() {
  return (
    <div className="pc-shell">
      <div className="pc-page">
        <header className="pc-header">
          <span className="pc-logo-block">
            <span className="pc-logo" aria-hidden>
              ¶
            </span>
            <span className="pc-doc-name">pilcrow-starter</span>
          </span>
          <span className="pc-header-spacer" />
          <button className="pc-icon-btn" type="button" title="Theme">
            <span aria-hidden>☼</span>
          </button>
          <button className="pc-icon-btn" type="button" title="File">
            <span aria-hidden>⋮</span>
          </button>
        </header>

        <div className="pc-doc">
          <EditorProvider
            initialConfig={{
              schemaDefinition: pilcrowSchema,
              initialValue: starterDocument,
              keyGenerator,
            }}
          >
            <PilcrowEditor />
          </EditorProvider>
        </div>

        <footer className="pc-floor">
          <span className="pc-floor-pilcrow" aria-hidden>
            ¶
          </span>
          <span>— words</span>
          <span className="pc-floor-sep">·</span>
          <span>— chars</span>
          <span className="pc-floor-sep">·</span>
          <span>~— min</span>
          <span className="pc-floor-sep">·</span>
          <span>not saved</span>
        </footer>
      </div>
    </div>
  )
}
