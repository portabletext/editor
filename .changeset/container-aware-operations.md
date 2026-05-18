---
'@portabletext/editor': patch
---

fix: operations and traversal utilities work at any container depth

A wave of internal helpers and operations were hard-coded against root-level paths (`path.at(0)` for the block, `path.at(2)` for the child). They now resolve the enclosing block via `getEnclosingBlock` and walk paths at any depth, so behaviors and operations behave identically inside an editable container as they do at the root.

- `isAtTheBeginningOfBlock` reads the focus child from the path tail so lists inside containers toggle correctly when the caret is at the start of a block.
- `isPointBeforeSelection` and `isPointAfterSelection` compare selection points at any depth. Pickers (emoji, typeahead) ask the right question inside containers.
- `getEventPosition` resolves the event's enclosing block via `getEnclosingBlock` so the drag-handle fallback identifies the correct block when the event fires on a text block inside a container.
- Collapsed range decorations resolve the anchor block via `getEnclosingBlock` and read the child segment from the path tail, so range decorations inside containers render correctly.
- The unhang logic treats editable containers like void blocks: a hanging range over a container removes the container as a unit.
- Incoming `diffMatchPatch` patches resolve the target span at any depth using the full path, instead of assuming a root-level block with a depth-2 `children` field.
- `editor.send({type: 'insert.block', ...})` and the Enter key insert at the right depth: a new line in a code-block lands inside the lines, a new paragraph in a callout lands inside the content, splitting the existing block in two when the caret sits in the middle.
- Cross-container range delete goes through the same range-delete primitive as same-parent deletes. The two paths used to disagree on which content survived; they now produce the same result.
