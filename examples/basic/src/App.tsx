import {
  defineSchema,
  EditorEventListener,
  EditorProvider,
  keyGenerator,
  PortableTextBlock,
  PortableTextChild,
  PortableTextEditable,
  PortableTextEditor,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderStyleFunction,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {useState} from 'react'
import './editor.css'

// Define the schema for the editor
// All options are optional
// Only the `name` property is required, but you can define a `title` and an `icon` as well
// You can use this schema definition later to build your toolbar
const schemaDefinition = defineSchema({
  // Decorators are simple marks that don't hold any data
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  // Annotations are more complex marks that can hold data
  annotations: [{name: 'link'}],
  // Styles apply to entire text blocks
  // There's always a 'normal' style that can be considered the paragraph style
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'blockqoute'},
  ],
  // Lists apply to entire text blocks as well
  lists: [{name: 'bullet'}, {name: 'number'}],
  // Inline objects hold arbitrary data that can be inserted into the text
  inlineObjects: [{name: 'stock-ticker'}],
  // Block objects hold arbitrary data that live side-by-side with text blocks
  blockObjects: [{name: 'image'}],
})

function App() {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    // Initial value
    () => [
      {
        _type: 'block',
        _key: keyGenerator(),
        children: [
          {_type: 'span', _key: keyGenerator(), text: 'Hello, '},
          {
            _type: 'span',
            _key: keyGenerator(),
            text: 'world!',
            marks: ['strong'],
          },
        ],
      },
    ],
  )

  return (
    <>
      {/* Create an editor */}
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: value,
        }}
      >
        {/* Subscribe to editor changes */}
        <EditorEventListener
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.snapshot)
            }
          }}
        />
        {/* Toolbar needs to be rendered inside the `EditorProvider` component */}
        <Toolbar />
        {/* Component that controls the actual rendering of the editor */}
        <PortableTextEditable
          style={{border: '1px solid black', padding: '0.5em'}}
          // Control how decorators are rendered
          renderDecorator={renderDecorator}
          // Control how annotations are rendered
          renderAnnotation={renderAnnotation}
          // Required to render block objects but also to make `renderStyle` take effect
          renderBlock={renderBlock}
          // Control how styles are rendered
          renderStyle={renderStyle}
          // Control how inline objects are rendered
          renderChild={renderChild}
          // Rendering lists is harder and most likely requires a fair amount of CSS
          // First, return the children like here
          // Next, look in the imported `editor.css` file to see how list styles are implemented
          renderListItem={(props) => <>{props.children}</>}
        />
      </EditorProvider>
      <pre style={{border: '1px dashed black', padding: '0.5em'}}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </>
  )
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  if (props.value === 'strong') {
    return <strong>{props.children}</strong>
  }
  if (props.value === 'em') {
    return <em>{props.children}</em>
  }
  if (props.value === 'underline') {
    return <u>{props.children}</u>
  }
  return <>{props.children}</>
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  if (props.schemaType.name === 'link') {
    return <span style={{textDecoration: 'underline'}}>{props.children}</span>
  }

  return <>{props.children}</>
}

const renderBlock: RenderBlockFunction = (props) => {
  if (props.schemaType.name === 'image' && isImage(props.value)) {
    return (
      <div
        style={{
          border: '1px dotted grey',
          padding: '0.25em',
          marginBlockEnd: '0.25em',
        }}
      >
        IMG: {props.value.src}
      </div>
    )
  }

  return <div style={{marginBlockEnd: '0.25em'}}>{props.children}</div>
}

function isImage(
  props: PortableTextBlock,
): props is PortableTextBlock & {src: string} {
  return 'src' in props
}

const renderStyle: RenderStyleFunction = (props) => {
  if (props.schemaType.value === 'h1') {
    return <h1>{props.children}</h1>
  }
  if (props.schemaType.value === 'h2') {
    return <h2>{props.children}</h2>
  }
  if (props.schemaType.value === 'h3') {
    return <h3>{props.children}</h3>
  }
  if (props.schemaType.value === 'blockquote') {
    return <blockquote>{props.children}</blockquote>
  }
  return <>{props.children}</>
}

const renderChild: RenderChildFunction = (props) => {
  if (props.schemaType.name === 'stock-ticker' && isStockTicker(props.value)) {
    return (
      <span
        style={{
          border: '1px dotted grey',
          padding: '0.15em',
        }}
      >
        {props.value.symbol}
      </span>
    )
  }

  return <>{props.children}</>
}

function isStockTicker(
  props: PortableTextChild,
): props is PortableTextChild & {symbol: string} {
  return 'symbol' in props
}

function Toolbar() {
  // Obtain the editor instance
  const editorInstance = usePortableTextEditor()
  // Rerender the toolbar whenever the selection changes
  usePortableTextEditorSelection()

  const decoratorButtons = schemaDefinition.decorators.map((decorator) => {
    return (
      <button
        key={decorator.name}
        style={{
          textDecoration: PortableTextEditor.isMarkActive(
            editorInstance,
            decorator.name,
          )
            ? 'underline'
            : 'unset',
        }}
        onClick={() => {
          // Toggle the decorator by name
          PortableTextEditor.toggleMark(editorInstance, decorator.name)
          // Pressing this button steals focus so let's focus the editor again
          PortableTextEditor.focus(editorInstance)
        }}
      >
        {decorator.name}
      </button>
    )
  })

  const linkButton = (
    <button
      style={{
        textDecoration: PortableTextEditor.isAnnotationActive(
          editorInstance,
          schemaDefinition.annotations[0].name,
        )
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        if (
          PortableTextEditor.isAnnotationActive(
            editorInstance,
            schemaDefinition.annotations[0].name,
          )
        ) {
          PortableTextEditor.removeAnnotation(
            editorInstance,
            schemaDefinition.annotations[0],
          )
        } else {
          PortableTextEditor.addAnnotation(
            editorInstance,
            schemaDefinition.annotations[0],
            {href: 'https://example.com'},
          )
        }
        PortableTextEditor.focus(editorInstance)
      }}
    >
      link
    </button>
  )

  const styleButtons = schemaDefinition.styles.map((style) => (
    <button
      key={style.name}
      style={{
        textDecoration: PortableTextEditor.hasBlockStyle(
          editorInstance,
          style.name,
        )
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleBlockStyle(editorInstance, style.name)
        PortableTextEditor.focus(editorInstance)
      }}
    >
      {style.name}
    </button>
  ))

  const listButtons = schemaDefinition.lists.map((list) => (
    <button
      key={list.name}
      style={{
        textDecoration: PortableTextEditor.hasListStyle(
          editorInstance,
          list.name,
        )
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleList(editorInstance, list.name)
        PortableTextEditor.focus(editorInstance)
      }}
    >
      {list.name}
    </button>
  ))

  const imageButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertBlock(
          editorInstance,
          schemaDefinition.blockObjects[0],
          {src: 'https://example.com/image.jpg'},
        )
        PortableTextEditor.focus(editorInstance)
      }}
    >
      {schemaDefinition.blockObjects[0].name}
    </button>
  )

  const stockTickerButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertChild(
          editorInstance,
          schemaDefinition.inlineObjects[0],
          {symbol: 'AAPL'},
        )
        PortableTextEditor.focus(editorInstance)
      }}
    >
      {schemaDefinition.inlineObjects[0].name}
    </button>
  )

  return (
    <>
      <div>{decoratorButtons}</div>
      <div>{linkButton}</div>
      <div>{styleButtons}</div>
      <div>{listButtons}</div>
      <div>{imageButton}</div>
      <div>{stockTickerButton}</div>
    </>
  )
}

export default App
