<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/portabletext/portabletext/master/logo-white.svg?sanitize=true">
  <img alt="Portable Text Logo" src="https://raw.githubusercontent.com/portabletext/portabletext/master/logo.svg?sanitize=true">
</picture>

<div align="center">
<h1>Portable Text Editor</h1>
</div>

> The official editor for editing [Portable Text](https://github.com/portabletext/portabletext) – the JSON based rich text specification for modern content editing platforms.

## Get started with the Portable Text Editor

This library provides you with the building blocks to create a completely custom editor experience built on top of Portable Text. We recommend [checking out the official documentation](https://www.portabletext.org/). The following guide includes the basics to get your started.

In order to set up an editor you'll need to:

- Create a schema that defines the rich text and block content elements.
- Create a toolbar to toggle and insert these elements.
- Write render functions to style and display each element type in the editor.
- Render the editor.

Check out [example application](/examples/basic/src/App.tsx) in this repo for a basic implementation of the editor. Most of the source code from this example app can also be found in the instructions below.

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
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import type {
  PortableTextBlock,
  RenderDecoratorFunction,
  RenderStyleFunction,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
```

### Define the Schema

Before you can render the editor, you need a schema. The editor schema configures the types of content rendered by the editor.

We'll start with a schema that includes some common rich text elements.

> [!NOTE]
> This guide includes a limited set of schema types, or rich text elements, to get you started. See the [rendering guide](https://www.portabletext.org/guides/custom-rendering/) for additional examples.

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

Learn more about the different types that exist in schema in the [Portable Text Overview](https://www.portabletext.org/concepts/portabletext/).

### Render the editor

With a schema defined, you have enough to render the editor. It won't do much yet, but you can confirm your progress.

Add `useState` from React, then scaffold out a basic application component. For example:

```tsx
// app.tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import type {
  PortableTextBlock,
  RenderDecoratorFunction,
  RenderStyleFunction,
} from '@portabletext/editor'
import {EventListenerPlugin} from '@portabletext/editor/plugins'
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

### Create render functions for schema elements

At this point the PTE only has a schema, but it doesn't know how to render anything. Fix that by creating render functions for each property in the schema.

Start by creating a render function for styles.

```tsx
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
```

Render functions all follow the same format.

- They take in props and return JSX elements.
- They use the schema to make decisions.
- They return JSX and pass `children` as a fallback.

With this in mind, continue for the remaining schema types.

Create a render function for decorators.

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
```

> [!NOTE]
> By default, text is rendered as an inline `span` element in the editor. While most render functions return a fragment (`<>`) as the fallback, make sure block level elements return blocks, like `<div>` elements.

Update the `PortableTextEditable` with each corresponding function to attach them to the editor.

You may notice that we skipped a few types from the schema. Declare these inline in the configuration, like in the code below. You can learn more about [customizing the render functions](https://www.portabletext.org/guides/custom-rendering/) in the documentation.

```tsx
<PortableTextEditable
  style={{border: '1px solid black', padding: '0.5em'}}
  renderStyle={renderStyle}
  renderDecorator={renderDecorator}
  renderBlock={(props) => <div>{props.children}</div>}
  renderListItem={(props) => <>{props.children}</>}
/>
```

Before you can see if anything changed, you need a way to interact with the editor.

### Create a toolbar

A toolbar is a collection of UI elements for interacting with the editor. The PTE library gives you the necessary hooks to create a toolbar however you like. Learn more about [creating your own toolbar](https://www.portabletext.org/guides/customize-toolbar/) in the documentation.

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

The `useEditor` hook gives you access to the active editor. `send` lets you send events to the editor. You can view the full list of events in the [Behavior API reference](https://www.portabletext.org/reference/behavior-api/).

> [!NOTE]
> The example above sends a `focus` event after each action. Normally when interacting with a button, the browser removes focus from the text editing area. This event returns focus to the field to prevent interrupting the user.

### Bring it all together

With render functions created and a toolbar in place, you can fully render the editor. Add the `Toolbar` inside the `EditorProvider`.

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
        <PortableTextEditable
          style={{border: '1px solid black', padding: '0.5em'}}
          renderStyle={renderStyle}
          renderDecorator={renderDecorator}
          renderBlock={(props) => <div>{props.children}</div>}
          renderListItem={(props) => <>{props.children}</>}
        />
      </EditorProvider>
    </>
  )
}
// ...
```

You can now enter text and interact with the toolbar buttons to toggle the styles and decorators. These are only a small portion of the types of things you can do. Check out the [custom rendering guide](https://www.portabletext.org/guides/custom-rendering/) and the [toolbar customization guide](https://www.portabletext.org/guides/customize-toolbar/) for options.

### View the Portable Text data

You can preview the Portable Text from the editor by reading the state. Add the following after the `EditorProvider`.

```tsx
<pre style={{border: '1px dashed black', padding: '0.5em'}}>
  {JSON.stringify(value, null, 2)}
</pre>
```

This displays the raw Portable Text. To customize how Portable Text renders in your apps, explore the [collection of serializers](https://www.portabletext.org/integrations/serializers/).

## Behavior API

The Behavior API is a new way of interfacing with the Portable Text Editor. It allows you to think of and treat the editor as a state machine by:

- Declaratively hooking into editor **events** and defining new behaviors.
- Imperatively triggering **events**.
- Deriving editor **state** using **pure functions**.
- Subscribing to **emitted** editor **events**.

Learn more about the [Behaviors](https://www.portabletext.org/concepts/behavior/) and how to [create your own behaviors](https://www.portabletext.org/guides/create-behavior/) in the documentation.

## End-User Experience

In order to provide a robust and consistent end-user experience, the editor is backed by an elaborate E2E test suite generated from a [human-readable Gherkin spec](/packages/editor/gherkin-spec/).

## Development

### Develop Together with Sanity Studio

1. Run `pnpm build:editor` to make sure it builds correctly
2. Now run `pnpm dev:editor` to run it in dev mode
3. In another terminal, open your local version of the [sanity](https://github.com/sanity-io/sanity) monorepo
4. `cd` into the `sanity` package and run `pnpm link <relative path to the **editor** package in this repo>`

Now, you should be able to run `pnpm dev:test-studio` in the `sanity` repo to test Studio with a locally running Portable Text Editor.

## Other Libraries

This monorepo also contains additional libraries that can be used with the Portable Text Editor:

### `@portabletext/keyboard-shortcuts`

> A TypeScript library for creating platform-aware keyboard shortcuts with automatic detection of Apple vs non-Apple platforms.

- 💻 [./packages/keyboard-shortcuts](./packages/keyboard-shortcuts/)
- 📦 [@portabletext/keyboard-shortcuts](https://www.npmjs.com/package/@portabletext/keyboard-shortcuts)

### `@portabletext/toolbar`

> Powered by [Behaviors](https://www.portabletext.org/concepts/behavior/) and [State Machines](https://stately.ai/docs/xstate), `@portabletext/toolbar` is a collection of robust React hooks for building toolbars and related UI components
> for the Portable Text editor.

- 💻 [./packages/toolbar](./packages/toolbar/)
- 📦 [@portabletext/toolbar](https://www.npmjs.com/package/@portabletext/toolbar)
