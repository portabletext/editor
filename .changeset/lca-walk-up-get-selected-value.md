---
'@portabletext/editor': minor
---

feat: `getSelectedValue` returns the smallest top-level-valid fragment containing the selection

`getSelectedValue` previously walked top-down from `editor.value` and preserved the full ancestor envelope around the selection. A selection inside a single table cell returned the whole table; a selection inside a callout returned the whole callout. The result was a valid `Array<PortableTextBlock>` but typically far larger than needed.

The selector now finds the lowest common ancestor of the selection's endpoints and emits the smallest fragment whose top-level items are valid at the editor's root.

- Selection inside one text block returns just that block, sliced to the selected portion.
- Selection inside a container whose child field accepts top-level types (e.g. a callout, a table cell) returns the container's children directly; the envelope is dropped.
- Selection spanning structural children whose types aren't valid at the top level (e.g. across two cells in one row) walks upward through ancestors until the contents fit at the top level, and wraps minimally.
- Selection across siblings at the editor root continues to return those siblings, with boundary blocks recursively sliced. This case is unchanged.

The return type is unchanged: `Array<PortableTextBlock>`. The clipboard and drag-and-drop payloads consumed via this selector no longer carry redundant ancestor envelopes.
