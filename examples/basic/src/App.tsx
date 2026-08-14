import './editor.css'
import {
  defineBlockObject,
  defineInlineObject,
  defineSchema,
  defineTextBlock,
  EditorProvider,
  keyGenerator,
  PortableTextBlock,
  PortableTextChild,
  PortableTextEditable,
  RenderAnnotationFunction,
  RenderDecoratorFunction,
  TextBlockRenderProps,
  useEditor,
  useEditorSelector,
} from '@portabletext/editor'
import {EventListenerPlugin, NodePlugin} from '@portabletext/editor/plugins'
import * as selectors from '@portabletext/editor/selectors'
import {ListIndexProvider, useListIndex} from '@portabletext/plugin-list-index'
import {useState} from 'react'

// Define the schema for the editor
// All options are optional
// Only the `name` property is required, but you can define a `title` and an `icon` as well
// You can use this schema definition later to build your toolbar
const schemaDefinition = defineSchema({
  // Decorators are simple marks that don't hold any data
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  // Annotations are more complex marks that can hold data
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  // Styles apply to entire text blocks
  // There's always a 'normal' style that can be considered the paragraph style
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'blockquote'},
  ],
  // Lists apply to entire text blocks as well
  lists: [{name: 'bullet'}, {name: 'number'}],
  // Inline objects hold arbitrary data that can be inserted into the text
  inlineObjects: [
    {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
  ],
  // Block objects hold arbitrary data that live side-by-side with text blocks
  blockObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
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
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.value)
            }
          }}
        />
        {/* Register how text blocks (styles and lists), inline objects, and block objects are rendered */}
        <NodePlugin nodes={[textBlock, stockTicker, imageBlock]} />
        {/* Toolbar needs to be rendered inside the `EditorProvider` component */}
        <Toolbar />
        {/* Provides the list numbering that `useListIndex` reads */}
        <ListIndexProvider>
          {/* Component that controls the actual rendering of the editor */}
          <PortableTextEditable
            style={{border: '1px solid black', padding: '0.5em'}}
            // Control how decorators are rendered
            renderDecorator={renderDecorator}
            // Control how annotations are rendered
            renderAnnotation={renderAnnotation}
          />
        </ListIndexProvider>
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

// Text blocks render through a registered node: the `render` callback owns
// the block's wrapper element and receives the block itself, so styles and
// lists are handled in one place
const textBlock = defineTextBlock({
  type: 'block',
  render: (props) => <TextBlock {...props} />,
})

function TextBlock(props: TextBlockRenderProps) {
  // The editor doesn't compute list numbering; `useListIndex` from
  // `@portabletext/plugin-list-index` does. The `data-*` attributes below
  // feed the list CSS — look in the imported `editor.css` file to see how
  // list styles are implemented
  const listIndex = useListIndex(props.path)

  let children = props.children
  if (props.node.style === 'h1') {
    children = <h1>{children}</h1>
  } else if (props.node.style === 'h2') {
    children = <h2>{children}</h2>
  } else if (props.node.style === 'h3') {
    children = <h3>{children}</h3>
  } else if (props.node.style === 'blockquote') {
    children = <blockquote>{children}</blockquote>
  }

  return (
    <div
      {...props.attributes}
      style={{marginBlockEnd: '0.25em'}}
      data-list-item={props.node.listItem}
      data-level={props.node.level}
      data-list-index={listIndex}
    >
      {children}
    </div>
  )
}

// Inline objects render through a registered node as well. `props.children`
// carries a hidden spacer the editor needs for caret placement; always
// render it inside the wrapper
const stockTicker = defineInlineObject({
  type: 'stock-ticker',
  render: (props) => (
    <span {...props.attributes}>
      {props.children}
      {/* `draggable` makes the object movable and keeps its text
          unselectable: a draggable element starts a drag instead of a
          text selection */}
      <span
        draggable={!props.readOnly}
        style={{
          display: 'inline-block',
          border: '1px dotted grey',
          padding: '0.15em',
        }}
      >
        {isStockTicker(props.node) ? props.node.symbol : null}
      </span>
    </span>
  ),
})

// Block objects render through a registered node as well. `props.children`
// carries a hidden spacer the editor needs for caret placement; always
// render it inside the wrapper
const imageBlock = defineBlockObject({
  type: 'image',
  render: (props) => (
    <div {...props.attributes}>
      {props.children}
      <div
        contentEditable={false}
        draggable={!props.readOnly}
        style={{
          border: '1px dotted grey',
          padding: '0.25em',
          marginBlockEnd: '0.25em',
        }}
      >
        {isImage(props.node) ? `IMG: ${props.node.src}` : null}
      </div>
    </div>
  ),
})

function isImage(
  props: PortableTextBlock,
): props is PortableTextBlock & {src: string} {
  return 'src' in props
}

function isStockTicker(
  props: PortableTextChild,
): props is PortableTextChild & {symbol: string} {
  return 'symbol' in props
}

function Toolbar() {
  // Obtain the editor instance
  const editor = useEditor()

  const decoratorButtons = schemaDefinition.decorators.map((decorator) => (
    <DecoratorButton key={decorator.name} decorator={decorator.name} />
  ))

  const annotationButtons = schemaDefinition.annotations.map((annotation) => (
    <AnnotationButton key={annotation.name} annotation={annotation} />
  ))

  const styleButtons = schemaDefinition.styles.map((style) => (
    <StyleButton key={style.name} style={style.name} />
  ))

  const listButtons = schemaDefinition.lists.map((list) => (
    <ListButton key={list.name} list={list.name} />
  ))

  const imageButton = (
    <button
      onClick={() => {
        editor.send({
          type: 'insert.block object',
          blockObject: {
            name: 'image',
            value: {src: 'https://example.com/image.jpg'},
          },
          placement: 'auto',
        })
        editor.send({type: 'focus'})
      }}
    >
      {schemaDefinition.blockObjects[0].name}
    </button>
  )

  const stockTickerButton = (
    <button
      onClick={() => {
        editor.send({
          type: 'insert.inline object',
          inlineObject: {
            name: 'stock-ticker',
            value: {symbol: 'AAPL'},
          },
        })
        editor.send({type: 'focus'})
      }}
    >
      {schemaDefinition.inlineObjects[0].name}
    </button>
  )

  return (
    <>
      <div>{decoratorButtons}</div>
      <div>{annotationButtons}</div>
      <div>{styleButtons}</div>
      <div>{listButtons}</div>
      <div>{imageButton}</div>
      <div>{stockTickerButton}</div>
    </>
  )
}

function DecoratorButton(props: {decorator: string}) {
  // Obtain the editor instance
  const editor = useEditor()
  // Check if the decorator is active using a selector
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.decorator),
  )

  return (
    <button
      style={{
        textDecoration: active ? 'underline' : 'unset',
      }}
      onClick={() => {
        // Toggle the decorator
        editor.send({
          type: 'decorator.toggle',
          decorator: props.decorator,
        })
        // Pressing this button steals focus so let's focus the editor again
        editor.send({type: 'focus'})
      }}
    >
      {props.decorator}
    </button>
  )
}

function AnnotationButton(props: {annotation: {name: string}}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.annotation.name),
  )

  return (
    <button
      style={{
        textDecoration: active ? 'underline' : 'unset',
      }}
      onClick={() => {
        if (active) {
          editor.send({
            type: 'annotation.remove',
            annotation: {
              name: props.annotation.name,
            },
          })
        } else {
          editor.send({
            type: 'annotation.add',
            annotation: {
              name: props.annotation.name,
              value:
                props.annotation.name === 'link'
                  ? {href: 'https://example.com'}
                  : {},
            },
          })
        }
        editor.send({type: 'focus'})
      }}
    >
      {props.annotation.name}
    </button>
  )
}

function StyleButton(props: {style: string}) {
  const editor = useEditor()
  const active = useEditorSelector(editor, selectors.isActiveStyle(props.style))

  return (
    <button
      style={{
        textDecoration: active ? 'underline' : 'unset',
      }}
      onClick={() => {
        editor.send({type: 'style.toggle', style: props.style})
        editor.send({type: 'focus'})
      }}
    >
      {props.style}
    </button>
  )
}

function ListButton(props: {list: string}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.list),
  )

  return (
    <button
      style={{
        textDecoration: active ? 'underline' : 'unset',
      }}
      onClick={() => {
        editor.send({
          type: 'list item.toggle',
          listItem: props.list,
        })
        editor.send({type: 'focus'})
      }}
    >
      {props.list}
    </button>
  )
}

export default App
