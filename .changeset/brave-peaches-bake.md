---
'@portabletext/editor': major
---

feat!: remove `PortableTextEditor` React component

## Migration

If you were using `PortableTextEditor` as a React component, switch to `EditorProvider`:

```diff
- import {PortableTextEditor} from '@portabletext/editor'
+ import {EditorProvider} from '@portabletext/editor'

- <PortableTextEditor
-   schemaType={schemaType}
-   value={value}
-   onChange={handleChange}
-   patches$={patches$}
- >
+ <EditorProvider
+   initialConfig={{
+     schemaDefinition: defineSchema({...}),
+     initialValue: value,
+   }}
+ >
    <PortableTextEditable />
- </PortableTextEditor>
+ </EditorProvider>
```

The `PortableTextEditorProps` type export has also been removed.
