---
'@portabletext/editor': patch
---

fix: draw a text block inside a text block as an inline object

A text block received inside another text block's children renders as an unknown inline object, with its fields intact and its siblings editable, without emitting patches that correct its children. Backspace after the object removes it and joins the surrounding text, with undo and redo support. Arrow keys step across the object without entering its hidden text. The text inside it no longer affects the parent's text direction.

`PortableTextEditor.isVoid` returns `true` for a text block inside a text block.
