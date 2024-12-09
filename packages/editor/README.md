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

## Behavior API (Beta)

The **Behavior API** is a new API for configuring the Portable Text Editor by declaratively hooking into editor events and defining new behaviors using `defineBehavior`. It allows you to do anything from hooking into `copy` events to implementing markdown shortcuts.

Behaviors allow you to customize the editor in ways that were previously not possible. They are close-to-the-metal and evolve around the three concepts **events**, **guards** and **actions**:

A "Behavior"

1. listens for an **event**,
2. uses an optional **guard** to determine if it should run
3. and raises a set of low-level **actions** to be performed on the editor.

> 💡 If statecharts is your jam then you can think of behaviors as a way of treating the editor as a statechart: https://statecharts.dev/

### Introduction to Behaviors

As a simple example, here is a behavior that

1. listens for the `insert.text` event, (the event fired when the user is typing)
2. checks that the inserted text is a lowercase `"a"`
3. and fires the same event with an uppercase `"A"` instead

```ts
const noLowerCaseA = defineBehavior({
  on: 'insert.text',
  guard: ({event}) => event.text === 'a',
  actions: [({event}) => [{...event, text: 'A'}]],
})
```

This behavior is probably not very useful, but is showcases a few important concepts:

1. Behaviors listen for **external** events performed on the editor.
2. Guards are used to conditionally trigger behaviors.
3. Most events have a default action of the same shape. This means that you can conveniently fire the same `event` as an action.

As an even simpler example, here is a behavior that listens for `insert.text` and does nothing but fire the same event as an action:

```ts
const reserveInsertText = defineBehavior({
  on: 'insert.text',
  actions: [({event}) => [event]],
})
```

`reverseInsertText` is unconditional because it has no guard. This means that if you define it before all other behaviors in the editor, then no other `insert.text` behavior will ever run. We have effectively reserved the `insert.text` event.

> 💡 Only one behavior per event is allowed to alter the default event action

Now, if you want to have a bit of fun, you can repurpose the behavior to fire `insert.text` twice. Now every character written in the editor will be produced twice:

```ts
const doubleInsertText = defineBehavior({
  on: 'insert.text',
  actions: [({event}) => [event, event]],
})
```

Or, if you want to log all inserted text, you can use the `effect` action in combination with the default action:

```ts
const logInsertText = defineBehavior({
    on: 'insert.text',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            console.log(event)
          },
        },
        event,
      ],
    ],
  }
```

---

Unconditional behaviors are going to be rare, but they have some usefulness. One example can be found in the "soft return" behavior built into the Portable Text Editor:

```ts
const softReturn = defineBehavior({
  on: 'insert.soft break',
  actions: [() => [{type: 'insert.text', text: '\n'}]],
})
```

This behavior listens for the `insert.soft break` event and fires an `insert.text` action with text `"\n"` instead. This is a core behavior that makes sure text blocks can't be split on <kbd>Shift+Enter</kbd>.

> 💡 If you would like to remove or overwrite this behavior **then you can**! See: [Overwriting Behaviors](#overwriting-behaviors).

However, most core behaviors and most of your custom behaviors are most likely going to be conditional since you don't want them to run all the time.

An example of a conditional behavior that can be found in the core is the "clear list on Enter" behavior:

```ts
const clearListOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const selectionCollapsed = selectionIsCollapsed({context})
    const focusListBlock = getFocusListBlock({context})

    if (
      !selectionCollapsed ||
      !focusListBlock ||
      !isEmptyTextBlock(focusListBlock.node)
    ) {
      return false
    }

    return {focusListBlock}
  },
  actions: [
    (_, {focusListBlock}) => [
      {
        type: 'text block.unset',
        props: ['listItem', 'level'],
        at: focusListBlock.path,
      },
    ],
  ],
})
```

This time we listen for the `insert.break` event (<kbd>Enter</kbd>) and here, the `guard` checks

1. that the selection is collapsed,
2. that the currently focused block is a list block
3. and that this list block is empty

If either of these conditions are falsy, the `guard` returns `false` and the actions won't fire. This allows the `insert.break` event to propagate through the system. If no other behavior overwrites it, the default action is triggered and the block is split as usual.

However, if all conditions are truthy, the `guard` returns an object with the `focusListBlock` (a truthy value) which then fires the `text block.unset` action to unset the `listItem` and `level` props on the block, effectively turning it into an ordinary text block.

The guard is able to determine this because it has access to the current editor `context`. The `EditorContext` includes the editor `schema`, the current `selection` and the current `value`:

```ts
type EditorContext = {
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
}
```

`selectionIsCollapsed` and `getFocusListBlock` are just pure functions (called "selectors") that derive state from this context. Both are built-in and exported from `@portabletext/editor/selectors` (along with a number of other useful, built-in selectors).

```ts
import {
  getFocusListBlock,
  selectionIsCollapsed,
} from '@portabletext/editor/selectors'
```

And you can even write your own selectors:

```ts
import type {EditorSelector} from '@portabletext/editor/selectors'

const selectionIsBackwards: EditorSelector<boolean> = ({context}) => {
  // ...
}
```

This behavior also shows another neat trick:

> 💡 You can return **parameters** from the `guard` that you can reuse when firing actions

This is extremely useful since you often want to perform a set of actions usings state selected in the guard. Instead of having to pluck that state again in the action callback, you can just return and reuse it.

### Defining Behaviors

To get started with Behaviors, import `coreBehaviors` from `@portabletext/editor/behaviors`:

```ts
import {coreBehaviors} from '@portabletext/editor/behaviors'
```

Next, spread the `coreBehaviors` into the optional `behaviors` array on the `initialConfig` of `EditorProvider`:

```tsx
<EditorProvider
  initialConfig={{
    schemaDefinition,
    behaviors: [...coreBehaviors],
  }}
>
  {/* ... */}
</EditorProvider>
```

Everything should work as before. The only difference is that we've manually defined the core behaviors of the editor.

Now, import `defineBehavior` from `@portabletext/editor/behaviors` and define a new behavior below the core behaviors:

```ts
import {coreBehaviors, defineBehavior} from '@portabletext/editor/behaviors'
```

```tsx
<EditorProvider
  initialConfig={{
    schemaDefinition,
    behaviors: [
      ...coreBehaviors,
      defineBehavior({
        // your behavior
      }),
    ],
  }}
>
  {/* ... */}
</EditorProvider>
```

This allows you to customize the editor behavior while still allowing the core behaviors to take precedence.

### Overwriting Behaviors

Many of the core behaviors of the editor have already been defined using `defineBehavior` and we'll continue to port core behaviors to this API. This means that if you leave `coreBehaviors` out of the `behaviors` array, then you already get a much more bare-bones editor experience that you can customize as you please. And if you want to pick and choose core behaviors, then you can import the `coreBehavior` object and pick just the core behaviors you want:

```ts
import {coreBehavior} from '@portabletext/editor/behaviors'
```

```tsx
<EditorProvider
  initialConfig={{
    schemaDefinition,
    behaviors: [
      coreBehavior.blockObjects.breakingBlockObject,
      coreBehavior.lists.indentListOnTab,
      coreBehavior.lists.unindentListOnShiftTab,
      coreBehavior.softReturn,
    ],
  }}
>
  {/* ... */}
</EditorProvider>
```

### Behavior Events

Behavior Events are separated into two categories:

1. Native Behavior Events
2. Synthetic Behavior Events

Native events don't have a default action while synthetic events do. Synthetic events can also be triggered [imperatively](#imperative-events).

#### Native Behavior Events

- `copy`
- `paste`
- `key.down`
- `key.up`

#### Synthetic Behavior Events

- `annotation.add`
- `annotation.remove`
- `annotation.toggle`
- `blur`
- `decorator.add`
- `decorator.remove`
- `decorator.toggle`
- `delete.backward`
- `delete.forward`
- `focus`
- `insert.block object`
- `insert.inline object`
- `insert.break`
- `insert.sort break`
- `insert.text`
- `list item.toggle`
- `style.toggle`

### Imperative Events

Setting up the editor using `EditorProvider` provides access to `useEditor()` which allows you to imperatively send synthetic events into the editor:

```ts
const editor = useEditor()
```

```tsx
<button
  onClick={() => {
    props.editor.send({
      type: 'decorator.toggle',
      decorator: 'strong',
    })
    props.editor.send({type: 'focus'})
  }}
>
  Toggle Bold
</button>
```

### Behavior Actions

As mentioned, all [Synthetic Behavior Events](#synthetic-behavior-events) exist as actions. Additional actions are:

- `insert.span`
- `insert.text block`
- `list item.add`
- `list item.remove`
- `move.block`
- `move.block down`
- `move.block up`
- `noop`
- `delete.block`
- `delete.text`
- `effect`
- `reselect`
- `select`
- `select.previous block`
- `select.next block`
- `style.add`
- `style.remove`
- `text block.set`
- `text block.unset`

## Development

### Develop Together with Sanity Studio

1. Run `pnpm build:editor` to make sure it builds correctly
2. Now run `pnpm dev:editor` to run it in dev mode
3. In another terminal, open your local version of the [sanity](https://github.com/sanity-io/sanity) monorepo
4. `cd` into the `sanity` package and run `pnpm link <relative path to the **editor** package in this repo>`

Now, you should be able to run `pnpm dev:test-studio` in the `sanity` repo to test Studio with a locally running Portable Text Editor.
