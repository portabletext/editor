---
"@portabletext/editor": patch
---

fix: select the inline object on dragstart instead of its text block

Starting a drag on an inline object now drags only that inline object. Previously the entire enclosing text block was picked up and dragged instead.
