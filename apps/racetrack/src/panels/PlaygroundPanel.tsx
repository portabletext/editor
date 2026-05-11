import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {defineSchema} from '@portabletext/schema'
import type {GarageEntry} from '../garage'

type PlaygroundPanelProps = {
  entry: GarageEntry
}

// A permissive playground schema; entries that need narrower schemas can
// add a per-entry schema field later. Today both entries are happy with
// this.
const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
  inlineObjects: [{name: 'stock-ticker'}],
})

export function PlaygroundPanel({entry}: PlaygroundPanelProps) {
  const {PlaygroundComponent} = entry

  return (
    <div className="rt-panel">
      <div className="rt-panel-header">
        <span className="rt-panel-header-title">Paddock</span>
        <span>{entry.name}</span>
      </div>
      <div className="rt-panel-body">
        <EditorProvider
          key={entry.id}
          initialConfig={{
            schemaDefinition,
          }}
        >
          <div className="rt-editor-host">
            <PortableTextEditable className="rt-editable" />
            <PlaygroundComponent />
          </div>
        </EditorProvider>
      </div>
    </div>
  )
}
