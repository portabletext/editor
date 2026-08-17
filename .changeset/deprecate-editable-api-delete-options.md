---
'@portabletext/editor': patch
---

fix: deprecate `EditableAPIDeleteOptions` in favor of behavior events

`EditableAPIDeleteOptions` is deprecated together with the `PortableTextEditor.delete` static it serves. Send a `delete` behavior event (with an optional `unit`) or a `delete.block` event via `editor.send` instead.
