---
"@portabletext/editor": patch
---

fix: select a dragged inline object at its destination instead of the caret after it

Dragging an inline object to a new position now leaves that object selected, the same as inserting one. Previously the caret was placed on the span immediately following the dropped object.
