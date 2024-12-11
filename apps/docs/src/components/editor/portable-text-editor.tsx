import {
  EditorEventListener,
  EditorProvider,
  keyGenerator,
  PortableTextEditable,
  type PortableTextBlock,
} from '@portabletext/editor'
import {PortableText} from '@portabletext/react'
import {useState} from 'react'
import {schemaDefinition} from './schema'
import {Toolbar} from './toolbar'

export function PortableTextEditor() {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    undefined,
  )
  const [showJsonPreview, setShowJsonPreview] = useState(true)
  const [showPortableTextPreview, setShowPortableTextPreview] = useState(true)

  return (
    <div>
      <EditorProvider
        initialConfig={{
          schemaDefinition,
        }}
      >
        <EditorEventListener
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.snapshot)
            }
          }}
        />
        <Toolbar />
        <PortableTextEditable
          style={{
            border: '1px solid black',
            padding: '0.5em',
            minHeight: '2em',
          }}
        />
      </EditorProvider>
      {value && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1em'}}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button onClick={() => setShowJsonPreview(!showJsonPreview)}>
              Toggle JSON Preview
            </button>
            <button
              onClick={() =>
                setShowPortableTextPreview(!showPortableTextPreview)
              }
            >
              Toggle Portable Text Preview
            </button>
          </div>
          {showJsonPreview && (
            <div>
              <pre>
                <code>{JSON.stringify(value, null, 2)}</code>
              </pre>
            </div>
          )}
          {showPortableTextPreview && (
            <div>
              <PortableText value={value} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
