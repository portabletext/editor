import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {defineSchema} from '@portabletext/schema'
import {MentionPickerPlugin} from '../plugins/mention-picker'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  annotations: [{name: 'link'}],
})

export function PlaygroundPanel() {
  return (
    <div className="rt-panel">
      <div className="rt-panel-header">
        <span className="rt-panel-header-title">Playground</span>
        <span>type @ to trigger the picker</span>
      </div>
      <div className="rt-panel-body">
        <EditorProvider
          initialConfig={{
            schemaDefinition,
          }}
        >
          <div className="rt-editor-host">
            <PortableTextEditable className="rt-editable" />
            <MentionPickerPlugin />
          </div>
        </EditorProvider>
      </div>
    </div>
  )
}
