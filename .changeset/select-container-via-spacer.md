---
'@portabletext/editor': minor
---

feat: select a container as a block-object via a spacer

`defineContainer`'s `render` callback now receives a `spacer`. Render it
anywhere in the container's chrome to make the container selectable as a
block-object: a selection on the spacer selects the container itself, and
while it is selected Backspace/Delete remove the whole container and
ArrowUp/ArrowDown move the caret to the adjacent block. Containers whose
render omits `spacer` stay caret-only, exactly as before.
