---
'@portabletext/editor': minor
---

feat: `getFragment` selector returns the smallest top-level-valid fragment covering the selection

A selection inside a single table cell used to put the entire table on the clipboard. A selection inside a callout used to put the callout envelope on the clipboard too. Every register clipboard converter (`application/x-portable-text`, `text/html`, `text/markdown`, `text/plain`) and the public `editor.getFragment()` method walked the value top-down and preserved the full ancestor envelope around the selection.

A new public selector, `getFragment`, returns the smallest top-level-valid fragment covering the selection as `Array<{node: PortableTextBlock; path: BlockPath}>`. Each entry pairs a block with its full keyed path in the editor's value. The path is what the drag-preview pipeline uses to resolve DOM nodes, and what custom consumers can use for source attribution or analytics.

- Selection inside one text block returns just that block, sliced to the selected portion.
- Selection inside a container whose child field accepts top-level types (a callout's `content`, a table cell's `content`) returns the container's children directly; the envelope is dropped.
- Selection spanning structural children whose types aren't valid at the top level (e.g. across two cells in one row) walks upward through ancestors until the contents fit at the top level, and wraps minimally.
- Selection across siblings at the editor root continues to return those siblings, with boundary blocks recursively sliced. This case is unchanged.

The four register clipboard converters and `editor.getFragment()` now use `getFragment` internally. Custom converters and any external consumer that needs the clipboard-shaped view of the current selection can compose the same selector instead of re-deriving it from `getSelectedValue`.

`getSelectedValue` is unchanged - it still returns the full envelope. JSDoc on both selectors cross-link the relationship.
