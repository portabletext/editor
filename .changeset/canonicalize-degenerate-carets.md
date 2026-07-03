---
'@portabletext/editor': patch
---

fix: push the canonical caret back when the browser parks it on an element

Clicking the whitespace around a container (a table's gutter, the editable's padding) could leave the blinking caret rendered in that whitespace, a position the document model cannot express, even though the editor's selection pointed at real content. The selection sync now pushes the canonical DOM range back whenever the browser parks a collapsed caret on an element, so the visible caret always sits where the selection actually is.
