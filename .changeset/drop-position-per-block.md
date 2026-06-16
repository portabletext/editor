---
'@portabletext/editor': patch
---

fix: re-render only the block at the drop position while dragging

Dragging a block in a large document no longer re-renders the whole editor on
every pointer move. Only the block gaining or losing the drop indicator
re-renders now, so drag latency stays flat as the document grows instead of
scaling with the number of blocks.
