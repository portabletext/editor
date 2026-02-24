---
'@portabletext/editor': major
---

feat!: remove `EditorChange` type

The `EditorChange` type and its variant types (`BlurChange`, `ConnectionChange`, `LoadingChange`, `MutationChange`) have been removed. `EditorChange` was the event type emitted by the removed `PortableTextEditor` React component and consumed by the `onChange` callback on the `PortableTextEditor` class.

Use `editor.on()` instead: `editor.on('value changed', ...)`, `editor.on('focused', ...)`, `editor.on('blurred', ...)`, `editor.on('selection', ...)`.
