---
"@portabletext/editor": major
---

feat!: remove `editor._internal` runtime field

The `_internal` field that exposed `editorActor`, `slateEditor`, and `editable` on the runtime editor object has been removed. Consumers that reached into this field through type casts (`editor as unknown as {_internal: ...}`) will get `undefined` at runtime in v7.

The supported public surface for advanced use cases is `editor.send(...)`, `editor.on(...)`, `editor.getSnapshot()`, `editor.dom`, and the selectors exported from `@portabletext/editor/selectors`. If your code depends on the underlying `slateEditor` history or actor state, please open an issue describing the use case so we can find a supported alternative.
