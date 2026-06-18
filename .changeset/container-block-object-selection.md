---
'@portabletext/editor': minor
---

feat: select an editable container as a block-object

A `defineContainer` container can now be selected as a block-object, the
UX void blocks already have. Clicking a non-editable region inside a
container's render (any `contentEditable={false}` element, for example a
code-block header or a table's border/handle) selects the container as a
unit; its editable body still places a caret on click. While a container
is selected this way, Backspace and Delete remove it and ArrowUp/ArrowDown
move the caret to the adjacent block.

Programmatically, a collapsed `select` event whose focus path is a
container now holds at that path when sent with
`selectContainerAsBlockObject: true`, rather than descending into the
container's first leaf.
