import {
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
import {schema} from './schema'

function App() {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    undefined,
  )

  return (
    <>
      <PortableTextEditor
        schemaType={schema}
        value={value}
        onChange={(change) => {
          if (change.type === 'mutation') {
            setValue(change.snapshot)
          }
        }}
      >
        <Toolbar />
        <PortableTextEditable
          style={{border: '1px solid black', padding: '0.5em'}}
          renderDecorator={renderDecorator}
          renderAnnotation={renderAnnotation}
          renderBlock={renderBlock}
          renderStyle={renderStyle}
          renderChild={renderChild}
          renderListItem={(props) => <>{props.children}</>}
        />
      </PortableTextEditor>
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
  const editor = usePortableTextEditor()
  usePortableTextEditorSelection()

  const decoratorButtons = editor.schemaTypes.decorators.map((decorator) => {
    return (
      <button
        key={decorator.value}
        style={{
          textDecoration: PortableTextEditor.isMarkActive(
            editor,
            decorator.value,
          )
            ? 'underline'
            : 'unset',
        }}
        onClick={() => {
          PortableTextEditor.toggleMark(editor, decorator.value)
          PortableTextEditor.focus(editor)
        }}
      >
        {decorator.value}
      </button>
    )
  })

  const linkButton = (
    <button
      style={{
        textDecoration: PortableTextEditor.isAnnotationActive(
          editor,
          editor.schemaTypes.annotations[0].name,
        )
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        if (
          PortableTextEditor.isAnnotationActive(
            editor,
            editor.schemaTypes.annotations[0].name,
          )
        ) {
          PortableTextEditor.removeAnnotation(
            editor,
            editor.schemaTypes.annotations[0],
          )
        } else {
          PortableTextEditor.addAnnotation(
            editor,
            editor.schemaTypes.annotations[0],
            {href: 'https://example.com'},
          )
        }
        PortableTextEditor.focus(editor)
      }}
    >
      link
    </button>
  )

  const styleButtons = editor.schemaTypes.styles.map((style) => (
    <button
      key={style.value}
      style={{
        textDecoration: PortableTextEditor.hasBlockStyle(editor, style.value)
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleBlockStyle(editor, style.value)
        PortableTextEditor.focus(editor)
      }}
    >
      {style.value}
    </button>
  ))

  const listButtons = editor.schemaTypes.lists.map((list) => (
    <button
      key={list.value}
      style={{
        textDecoration: PortableTextEditor.hasListStyle(editor, list.value)
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleList(editor, list.value)
        PortableTextEditor.focus(editor)
      }}
    >
      {list.value}
    </button>
  ))

  const imageButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertBlock(
          editor,
          editor.schemaTypes.blockObjects[0],
          {src: 'https://example.com/image.jpg'},
        )
        PortableTextEditor.focus(editor)
      }}
    >
      {editor.schemaTypes.blockObjects[0].name}
    </button>
  )

  const stockTickerButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertChild(
          editor,
          editor.schemaTypes.inlineObjects[0],
          {symbol: 'AAPL'},
        )
        PortableTextEditor.focus(editor)
      }}
    >
      {editor.schemaTypes.inlineObjects[0].name}
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
