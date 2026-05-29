# Table Plugin

> 📊 Table support for the Portable Text Editor

**Status:** skeleton package, private. Not yet published to npm.

This package will host the schema, container registrations, and behaviors for first-class tables in the Portable Text Editor. The goal is to support tables across standalone PTE, Sanity Studio, and Sanity Canvas with a single shared core.

## Planned API

```tsx
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {TablePlugin} from '@portabletext/plugin-table'

function App() {
  return (
    <EditorProvider initialConfig={{schemaDefinition}}>
      <PortableTextEditable />
      <TablePlugin />
    </EditorProvider>
  )
}
```
