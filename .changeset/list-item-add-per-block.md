---
'@portabletext/editor': patch
---

fix: apply list-item toggle per block when selection crosses sub-schemas

`list item.add` now filters selected text blocks to those whose sub-schema
declares the list, instead of bailing globally when the focus block doesn't
allow it. Toggling a numbered list across a selection that spans a root text
block and a callout that allows only bullet lists now applies the list at
the root and skips the callout, instead of being a no-op.
