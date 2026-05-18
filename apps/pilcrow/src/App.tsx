import {EditorProvider, keyGenerator} from '@portabletext/editor'
import {PilcrowEditor} from './editor'
import {DotsVerticalIcon, MoonIcon, SunIcon} from './icons'
import {pilcrowSchema} from './schema'
import {starterDocument} from './starter-document'
import {useTheme} from './use-theme'

export function App() {
  const {theme, toggleTheme} = useTheme()
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
          <button
            className="pc-icon-btn"
            type="button"
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="pc-icon-btn" type="button" title="File menu">
            <DotsVerticalIcon />
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
            <PilcrowEditor theme={theme} />
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
