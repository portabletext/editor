---
'@portabletext/editor': major
---

feat!: remove `EditableAPI` and `OnBeforeInputFn` type exports

`EditableAPI` is an internal interface backing the `PortableTextEditor` static methods, never intended for public use. It was accidentally exported to fix typedoc resolution. `OnBeforeInputFn` was the callback type for the `onBeforeInput` prop, which has since been removed.

The static methods on `PortableTextEditor` still work as before. Only the type exports are removed.
