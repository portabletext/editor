<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/portabletext/portabletext/master/logo-white.svg?sanitize=true">
  <img alt="Portable Text Logo" src="https://raw.githubusercontent.com/portabletext/portabletext/master/logo.svg?sanitize=true">
</picture>

<div align="center">
<h1>Portable Text Editor</h1>
</div>

> The official editor for editing [Portable Text](https://github.com/portabletext/portabletext) – the JSON based rich text specification for modern content editing platforms.

## Get started with the Portable Text Editor (PTE)

This library provides you with the building blocks to create a completely custom editor experience built on top of Portable Text. We recommend [checking out the official documentation](https://www.portabletext.org/). The following guide includes the basics to get your started.

In order to set up an editor you'll need to:

- Create a schema that defines the rich text and block content elements.
- Create a toolbar to toggle and insert these elements.
- Set up rendering for each element type in the editor, including text blocks and inline formatting.
- Render the editor.

Check out the [Portable Text Playground](../../apps/playground/) for a comprehensive example of the editor in action.

### Add the library to your project

```sh
# npm
npm i @portabletext/editor

# pnpm
pnpm add @portabletext/editor

# yarn
yarn add @portabletext/editor

```

Next, in your app or the component you're building, import `EditorProvider`, `PortableTextEditable`, `defineSchema`, `EventListenerPlugin`, and the types in the code below.

```tsx
// App.tsx
import {
  defineDecorator,
  defineSchema,
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import type {PortableTextBlock} from '@portabletext/editor'
import {EventListenerPlugin, NodePlugin} from '@portabletext/editor/plugins'
```

### Define the schema

Before you can render the editor, you need a schema. The editor schema configures the types of content rendered by the editor.

We'll start with a schema that includes some common rich text elements.

> [!NOTE]
> This guide includes a limited set of schema types, or rich text elements, to get you started. See the [rendering guide](https://www.portabletext.org/editor/guides/custom-rendering/) for additional examples.

```tsx
// App.tsx
// ...
const schemaDefinition = defineSchema({
  // Decorators are simple marks that don't hold any data
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
  // Styles apply to entire text blocks
  // There's always a 'normal' style that can be considered the paragraph style
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'blockquote'},
  ],

  // The types below are left empty for this example.
  // See the rendering guide to learn more about each type.

  // Annotations are more complex marks that can hold data (for example, hyperlinks).
  annotations: [],
  // Lists apply to entire text blocks as well (for example, bullet, numbered).
  lists: [],
  // Inline objects hold arbitrary data that can be inserted into the text (for example, custom emoji).
  inlineObjects: [],
  // Block objects hold arbitrary data that live side-by-side with text blocks (for example, images, code blocks, and tables).
  blockObjects: [],
})
```

Learn more about the different types that exist in schema in the [Portable Text Overview](https://www.portabletext.org/editor/concepts/portabletext/).

### Render the editor

With a schema defined, you have enough to render the editor. It won't do much yet, but you can confirm your progress.

Add `useState` from React, then scaffold out a basic application component. For example:

```tsx
// app.tsx
import {
  defineDecorator,
  defineSchema,
  defineTextBlock,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import type {PortableTextBlock} from '@portabletext/editor'
import {EventListenerPlugin, NodePlugin} from '@portabletext/editor/plugins'
import {useState} from 'react'

const schemaDefinition = defineSchema({
  /* your schema from the previous step */
})

function App() {
  // Set up the initial state getter and setter. Leave the starting value as undefined for now.
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    undefined,
  )

  return (
    <>
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: value,
        }}
      >
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.value)
            }
          }}
        />
        <PortableTextEditable
          // Add an optional style to see it more easily on the page
          style={{border: '1px solid black', padding: '0.5em'}}
        />
      </EditorProvider>
    </>
  )
}

export default App
```

Include the `App` component in your application and run it. You should see an outlined editor that accepts text, but doesn't do much else.

### Set up rendering for schema elements

At this point the editor renders every text block as plain text, whatever its style. Fix that by registering a `defineTextBlock` node for the text blocks and `defineDecorator`/`defineAnnotation` nodes for the marks. If your editor rendered through the `renderStyle`, `renderBlock`, `renderListItem`, `renderChild`, `renderDecorator`, and `renderAnnotation` props, removed in this major, see the [migration guide](https://www.portabletext.org/editor/guides/migrate-render-props/) to move to node registrations instead.

Start by registering the text block render with `defineTextBlock`. The editor dispatches every text block to this callback. Your callback owns the block's wrapper element, so spread `props.attributes` on the outermost element you return, and use the block's `style` to pick the element.

```tsx
const textBlock = defineTextBlock({
  type: 'block',
  render: (props) => {
    if (props.node.style === 'h1') {
      return <h1 {...props.attributes}>{props.children}</h1>
    }
    if (props.node.style === 'h2') {
      return <h2 {...props.attributes}>{props.children}</h2>
    }
    if (props.node.style === 'h3') {
      return <h3 {...props.attributes}>{props.children}</h3>
    }
    if (props.node.style === 'blockquote') {
      return <blockquote {...props.attributes}>{props.children}</blockquote>
    }
    return <div {...props.attributes}>{props.children}</div>
  },
})
```

Marks (decorators and annotations) join the same `nodes` array. Registrations all follow the same shape.

- They take in props and return JSX elements.
- They decide what to render from the registration's `type` and the node itself, not a separate schema-type argument.
- They return JSX that renders `children` somewhere inside it, the editable content the registration wraps.

With this in mind, continue for the remaining schema types.

Register a decorator with `defineDecorator`, one per decorator name.

```tsx
const strong = defineDecorator({
  type: 'strong',
  render: ({children}) => <strong>{children}</strong>,
})
const em = defineDecorator({
  type: 'em',
  render: ({children}) => <em>{children}</em>,
})
const underline = defineDecorator({
  type: 'underline',
  render: ({children}) => <u>{children}</u>,
})

const nodes = [textBlock, strong, em, underline]
```

> [!NOTE]
> By default, text is rendered as an inline `span` element in the editor. A decorator's render can pass `children` through unwrapped, but the registered text block render must return a block-level element, like a `<div>`.

Mount every registration through one `NodePlugin`, inside the `EditorProvider`. Keep the `nodes` array itself at module scope, as above: a fresh array on every render would make `NodePlugin` unregister and re-register on every keystroke. You can learn more about [customizing the rendering](https://www.portabletext.org/editor/guides/custom-rendering/) in the documentation.

```tsx
<>
  <NodePlugin nodes={nodes} />
  <PortableTextEditable style={{border: '1px solid black', padding: '0.5em'}} />
</>
```

Before you can see if anything changed, you need a way to interact with the editor.

### Create a toolbar

A toolbar is a collection of UI elements for interacting with the editor. [`@portabletext/toolbar`](../toolbar/) provides ready-made hooks (`useStyleSelector`, `useDecoratorButton`, and more) for common toolbar UI; see the [toolbar customization guide](https://www.portabletext.org/editor/guides/customize-toolbar/) to use them. What follows here is the lower-level approach: sending events to the editor directly.

1. Create a `Toolbar` component in the same file.
2. Import the `useEditor` hook, and declare an `editor` constant in the component.
3. Iterate over the schema types to create toggle buttons for each style and decorator.
4. Send events to the editor to toggle the styles and decorators whenever the buttons are clicked.
5. Render the toolbar buttons.

```tsx
// App.tsx
// ...
import {useEditor} from '@portabletext/editor'

function Toolbar() {
  // useEditor provides access to the PTE
  const editor = useEditor()

  // Iterate over the schema (defined earlier), or manually create buttons.
  const styleButtons = schemaDefinition.styles.map((style) => (
    <button
      key={style.name}
      onClick={() => {
        // Send style toggle event
        editor.send({
          type: 'style.toggle',
          style: style.name,
        })
        editor.send({
          type: 'focus',
        })
      }}
    >
      {style.name}
    </button>
  ))

  const decoratorButtons = schemaDefinition.decorators.map((decorator) => (
    <button
      key={decorator.name}
      onClick={() => {
        // Send decorator toggle event
        editor.send({
          type: 'decorator.toggle',
          decorator: decorator.name,
        })
        editor.send({
          type: 'focus',
        })
      }}
    >
      {decorator.name}
    </button>
  ))
  return (
    <>
      {styleButtons}
      {decoratorButtons}
    </>
  )
}
```

The `useEditor` hook gives you access to the active editor. `send` lets you send events to the editor. You can view the full list of events in the [Behavior API reference](https://www.portabletext.org/editor/reference/behavior-api/).

> [!NOTE]
> The example above sends a `focus` event after each action. Normally when interacting with a button, the browser removes focus from the text editing area. This event returns focus to the field to prevent interrupting the user.

### Bring it all together

With the registrations created and a toolbar in place, you can fully render the editor. Add the `Toolbar` inside the `EditorProvider`.

```tsx
// App.tsx
// ...
function App() {
  const [value, setValue] = useState<Array<PortableTextBlock> | undefined>(
    undefined,
  )

  return (
    <>
      <EditorProvider
        initialConfig={{
          schemaDefinition,
          initialValue: value,
        }}
      >
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              setValue(event.value)
            }
          }}
        />
        <Toolbar />
        <NodePlugin nodes={nodes} />
        <PortableTextEditable
          style={{border: '1px solid black', padding: '0.5em'}}
        />
      </EditorProvider>
    </>
  )
}
// ...
```

You can now enter text and interact with the toolbar buttons to toggle the styles and decorators. These are only a small portion of the types of things you can do. Check out the [custom rendering guide](https://www.portabletext.org/editor/guides/custom-rendering/) and the [toolbar customization guide](https://www.portabletext.org/editor/guides/customize-toolbar/) for options.

### View the Portable Text data

You can preview the Portable Text from the editor by reading the state. Add the following after the `EditorProvider`.

```tsx
<pre style={{border: '1px dashed black', padding: '0.5em'}}>
  {JSON.stringify(value, null, 2)}
</pre>
```

This displays the raw Portable Text. To customize how Portable Text renders in your apps, explore the [collection of serializers](https://www.portabletext.org/rendering/).

## Behavior API

The Behavior API is a way of interfacing with the PTE. It allows you to think of and treat the editor as a state machine by:

- Declaratively hooking into editor **events** and defining new behaviors.
- Imperatively triggering **events**.
- Deriving editor **state** using **pure functions**.
- Subscribing to **emitted** editor **events**.

Learn more about the [Behaviors](https://www.portabletext.org/editor/concepts/behavior/) and how to [create your own behaviors](https://www.portabletext.org/editor/guides/create-behavior/) in the documentation.

## Related packages

[`@portabletext/toolbar`](../toolbar/) provides React hooks for building toolbars and related UI components.

### Plugins

Extend the editor with [official plugins](../../#editor-plugins).

## End-user experience

In order to provide a robust and consistent end-user experience, the editor is backed by an elaborate E2E test suite generated from a [human-readable Gherkin spec](./gherkin-spec/).

## Development

### Develop with Sanity Studio

1. Run `pnpm build:editor` to build the editor
2. Run `pnpm dev:editor` to start dev mode
3. In the [sanity](https://github.com/sanity-io/sanity) monorepo, link the editor package:
   ```sh
   cd packages/sanity
   pnpm link <path-to-this-repo>/packages/editor
   ```
4. Run `pnpm dev:test-studio` in the sanity repo
