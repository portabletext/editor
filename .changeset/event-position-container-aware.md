---
"@portabletext/editor": patch
---

fix: identify the dragged or clicked block at any depth in `getEventPosition`

The fallback that picks up the event's block when the DOM selection is missing or mismatched (introduced in #915 to align drag-handle events with the dragged block) read `eventPath.slice(0, 1)` for the block lookup, so an event fired on a text block inside a container resolved to the container's root segment instead of the inner block. Resolves the event's enclosing block via `getEnclosingBlock` so the fallback identifies the right block at any depth.
