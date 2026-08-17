import {
  defineSchema,
  EditorProvider,
  keyGenerator,
  PortableTextEditable,
} from '@portabletext/editor'
import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'

// The full content model, zero render config: no render props, no node
// registrations, no plugins, no CSS. What you see is the editor's own
// default rendering.
const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'blockquote'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  inlineObjects: [
    {name: 'mention', fields: [{name: 'userId', type: 'string'}]},
  ],
  blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
})

const initialValue = [
  {
    _type: 'block',
    _key: keyGenerator(),
    children: [
      {_type: 'span', _key: keyGenerator(), text: 'Hello '},
      {_type: 'mention', _key: keyGenerator(), userId: 'u1'},
      {_type: 'span', _key: keyGenerator(), text: ' world'},
    ],
  },
  {_type: 'image', _key: keyGenerator(), src: 'https://example.com/cat.jpg'},
  {
    _type: 'block',
    _key: keyGenerator(),
    children: [{_type: 'span', _key: keyGenerator(), text: 'A list item'}],
    listItem: 'bullet',
    level: 1,
  },
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main
      style={{maxWidth: '40rem', margin: '2rem auto', fontFamily: 'sans-serif'}}
    >
      <h1>Vanilla PTE</h1>
      <p>No render config. Editor defaults only.</p>
      <EditorProvider initialConfig={{schemaDefinition, initialValue}}>
        <PortableTextEditable
          style={{
            border: '1px solid #ccc',
            padding: '0.5em',
            minHeight: '10rem',
          }}
        />
      </EditorProvider>
    </main>
  </StrictMode>,
)
