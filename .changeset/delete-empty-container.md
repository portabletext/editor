---
'@portabletext/editor': minor
---

feat: unwrap empty editable containers on Backspace and Delete

Pressing Backspace or Delete inside an empty editable container now unwraps the container so its empty inner block becomes a sibling at the container's parent level. The cursor follows the unwrapped block, so a second keystroke merges or deletes it like any ordinary empty text block.

When the container's parent doesn't accept the inner block (a callout sitting alone in a table cell, for example), the unwrap walks up through structural ancestors, dissolving each level that holds only the chain on its way out, until it finds an ancestor whose parent's field accepts the payload. If no level accepts every type in the payload, or if the chain hits a non-lonely ancestor along the way, the keystroke is a no-op.

The editor doesn't need to know what the container represents: code-blocks, callouts, fact-boxes, and table cells in single-cell rows all dissolve the same way once their content is empty.
