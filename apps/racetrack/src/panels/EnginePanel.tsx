import {useState} from 'react'
import type {GarageEntry} from '../garage'

type EnginePanelProps = {
  entry: GarageEntry
}

export function EnginePanel({entry}: EnginePanelProps) {
  const [activeFileName, setActiveFileName] = useState(
    () => entry.engine[0]?.name ?? '',
  )

  // When the entry changes the previous active file name may no longer
  // exist; resolve to the new entry's first file if so. Reading state
  // and falling back during render avoids a render-then-effect-then-
  // re-render flicker.
  const activeFile =
    entry.engine.find((file) => file.name === activeFileName) ?? entry.engine[0]

  if (!activeFile) {
    return null
  }

  return (
    <div className="rt-panel">
      <div className="rt-panel-header">
        <span className="rt-panel-header-title">Engine</span>
        <div className="rt-engine-tabs">
          {entry.engine.map((file) => (
            <button
              key={file.name}
              type="button"
              className={`rt-engine-tab${
                file.name === activeFile.name ? ' rt-engine-tab--active' : ''
              }`}
              onClick={() => setActiveFileName(file.name)}
            >
              {file.name}
            </button>
          ))}
        </div>
      </div>
      <div className="rt-panel-body rt-engine-body">
        <pre className="rt-engine-source" data-language={activeFile.language}>
          <code>{activeFile.source}</code>
        </pre>
      </div>
    </div>
  )
}
