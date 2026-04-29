---
'@portabletext/editor': patch
---

fix: refresh `internalDrag.origin` on every `dragstart`

When `dragend` was missed after a successful drop (which happens consistently in some browser/layout combinations), the editor machine stayed in `dragging internally` and ignored subsequent `dragstart` events. Any later drop then read the previous gesture's drag origin while `dataTransfer` carried the new gesture's content, deleting the wrong block and duplicating the new one. `dragstart` now re-assigns `internalDrag.origin` even when the machine has not returned to `idle`.
