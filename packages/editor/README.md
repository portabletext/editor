<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/portabletext/portabletext/master/logo-white.svg?sanitize=true">
  <img alt="Portable Text Logo" src="https://raw.githubusercontent.com/portabletext/portabletext/master/logo.svg?sanitize=true">
</picture>

<div align="center">
<h1>Portable Text Editor</h1>
</div>

> The official editor for editing [Portable Text](https://github.com/portabletext/portabletext) – the JSON based rich text specification for modern content editing platforms.

> [!NOTE]
> We are currently working hard on the general release of this component. Better docs and refined APIs are coming.

## End-User Experience

In order to provide a robust and consistent end-user experience, the editor is backed by an elaborate E2E test suite generated from a [human-readable Gherkin spec](/packages/editor/gherkin-spec/).

## Build Your Own Portable Text Editor

> [!WARNING]
> The `@portabletext/editor` is currently on the path to deprecate legacy APIs and introduce new ones. The end goals are to make the editor easier to use outside of `Sanity` (and without `@sanity/*` libraries) as well as providing a brand new API to configure the behavior of the editor.
>
> This means that the `defineSchema` and `EditorProvider` APIs showcased here are still experimental APIs tagged with `@alpha` and cannot be considered stable yet. At the same time, the examples below showcase usages of legacy static methods on the `PortableTextEditor` (for example, `PortableTextEditor.isMarkActive(...)` and `PortableTextEditor.toggleMark(...)`) that will soon be discouraged and deprecrated.

Check [/examples/basic/src/App.tsx](/examples/basic/src/App.tsx) for a basic example of how to set up the edior. Most of the source code from this example app can also be found in the instructions below.

### Define the Schema

The first thing to do is to define the editor schema definition. The schema definition is later passed into the editor where it's compiled and used in various callbacks and render functions.

```ts
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
```

### Render the Editor Component

Use `EditorProvider` to configure an editor and use `EditorEventListener` to listen for `mutation` changes inside the editor so you can use and store the value produced.

```tsx
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
```

### Render Marks, Blocks and Objects

All the different render functions passed to `PortableTextEditable` can be defined as stand-alone React components. Most of these are fairly straightforward to render because everything you need is provided via `props`. However, lists are a little special. Since Portable Text has no concept of block nesting, the easiest way get something looking like lists is with pure CSS. Head over to [/examples/basic/src/editor.css](/examples/basic/src/editor.css) for a full example.

```tsx
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
```

### Render the Toolbar

Your toolbar needs to be rendered within `EditorProvider` because it requires a reference to the `editorInstance` that it produces. To toggle marks and styles and to insert objects, you'll have to use this `editorInstance` together with static methods on the `PortableTextEditor` class.

```tsx
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
```

## Behavior API (Coming Soon)

The Behavior API is a new way of interfacing with the Portable Text Editor. It allows you to think of and treat the editor as a state machine by:

1. Declaratively hooking into editor **events** and defining new behaviors using `defineBehavior`. (A "Behavior" (1) listens for an **event**, (2) uses a **guard** to determine whether it should run and (3) raises a set of **actions** to be performed on the editor.)
2. Imperatively trigger **events** using `editor.send(…)` which in turn can trigger behaviors defined using `defineBehavior`.
3. Deriving editor **state** using **pure functions**.
4. Subscribe to **emitted** editor **events** using `editor.on(…)`.

## Development

### Develop Together with Sanity Studio

1. Run `pnpm build:editor` to make sure it builds correctly
2. Now run `pnpm dev:editor` to run it in dev mode
3. In another terminal, open your local version of the [sanity](https://github.com/sanity-io/sanity) monorepo
4. `cd` into the `sanity` package and run `pnpm link <relative path to the **editor** package in this repo>`

Now, you should be able to run `pnpm dev:test-studio` in the `sanity` repo to test Studio with a locally running Portable Text Editor.
