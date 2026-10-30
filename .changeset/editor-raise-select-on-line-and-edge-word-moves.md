---
'@portabletext/editor': patch
---

fix: raise `select` on line moves and on word moves at the document edge

Extending the selection by line (Option+Shift+ArrowUp/ArrowDown), moving an expanded selection by line at the start or end of the document (Option+ArrowUp/ArrowDown), and moving by word at the end or start of the document (Ctrl+ArrowRight/ArrowLeft, Option+ArrowRight/ArrowLeft on Apple) now raise a `select` event when they change the selection, so Behaviors on `select` see these changes and can override or prevent them. Before, these moves bypassed `select`, and a word move could land a selection that a Behavior had just prevented.
