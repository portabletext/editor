# `@portabletext/plugin-one-line`

> Restrict the Portable Text Editor to a single line

## Installation

```sh
npm install @portabletext/plugin-one-line
```

## Usage

The plugin blocks `insert.break` events and provides smart handling of other `insert.*` events like `insert.block`.

Configure it with as high priority as possible to make sure other plugins don't overwrite `insert.*` events before this plugin gets a chance to do so.

Import the `OneLinePlugin` React component and place it inside the `EditorProvider` to automatically register the necessary Behaviors:

```tsx
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
} from '@portabletext/editor'
import {OneLinePlugin} from '@portabletext/plugin-one-line'

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <PortableTextEditable />
      <OneLinePlugin />
    </EditorProvider>
  )
}
```

## Soft line breaks

The plugin keeps the value to one block, but Shift+Enter still inserts a soft line break (a `\n` inside the text). That suits inputs like comment fields, where Enter submits and Shift+Enter starts a new line.

To disallow soft line breaks as well, register a Behavior that drops `insert.soft break`:

```tsx
import {defineBehavior} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'

const noSoftBreakBehavior = defineBehavior({
  on: 'insert.soft break',
  actions: [],
})

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition: defineSchema({})}}>
      <PortableTextEditable />
      <OneLinePlugin />
      <BehaviorPlugin behaviors={[noSoftBreakBehavior]} />
    </EditorProvider>
  )
}
```
