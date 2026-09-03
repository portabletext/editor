---
'@portabletext/plugin-dnd': patch
---

fix: derive the dragged-block facts once per drag instead of per `dragover`

The `dragover` guard no longer re-derives which blocks are being dragged (the drag selection, the dragged block keys, and the entire-blocks check, all of which scan the document) on every pointer move. These facts are now computed once per drag and reused, so dragging over large documents does less work per `dragover`. They are recomputed when the document changes mid-drag, for example when a remote edit lands, so the indicator keeps reflecting the current document.
