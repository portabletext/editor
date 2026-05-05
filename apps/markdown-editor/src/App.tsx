import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type RenderDecoratorFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'

const schemaDefinition = defineSchema({
  decorators: [
    {name: 'strong'},
    {name: 'em'},
    {name: 'underline'},
    {name: 'code'},
  ],
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'h3'}],
  lists: [{name: 'bullet'}, {name: 'number'}, {name: 'task'}],
})

const renderDecorator: RenderDecoratorFunction = (props) => {
  if (props.value === 'strong') return <strong>{props.children}</strong>
  if (props.value === 'em') return <em>{props.children}</em>
  if (props.value === 'underline') return <u>{props.children}</u>
  if (props.value === 'code') return <code>{props.children}</code>
  return <>{props.children}</>
}

const renderStyle: RenderStyleFunction = (props) => {
  if (props.schemaType.value === 'h1') return <h1>{props.children}</h1>
  if (props.schemaType.value === 'h2') return <h2>{props.children}</h2>
  if (props.schemaType.value === 'h3') return <h3>{props.children}</h3>
  return <>{props.children}</>
}

function App() {
  return (
    <main>
      <h1>Markdown editor (PTE)</h1>
      <EditorProvider initialConfig={{schemaDefinition}}>
        <PortableTextEditable
          placeholder="Write Markdown..."
          renderDecorator={renderDecorator}
          renderStyle={renderStyle}
          renderListItem={(props) => <>{props.children}</>}
        />
      </EditorProvider>
    </main>
  )
}

export default App
