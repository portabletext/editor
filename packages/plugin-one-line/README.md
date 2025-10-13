# One-Line Plugin

> 🤏 Restricts the Portable Text Editor to a single line

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
