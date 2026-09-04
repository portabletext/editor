---
'@portabletext/editor': patch
---

fix: scope each editable's `rangeDecorations` prop to its own layer

Two `PortableTextEditable`s under one `EditorProvider` share one document, so both render every active decoration. Previously, though, both editables' `rangeDecorations` prop fed into the same shared source, so the second editable's prop replaced the first editable's outright. Each editable's prop is now its own composed source: two editables' `rangeDecorations` props now coexist instead of the later one replacing the earlier one's, and unmounting an editable removes only its own contribution, leaving the other editable's prop decorations and any `registerRangeDecorations` layer untouched.
