---
'@portabletext/editor': patch
---

fix: unify delete primitives into `deleteRange` and `deleteCollapsed`

Internal refactor that collapses three near-overlapping delete primitives (`deleteText`, `deleteRange`, `deleteExpandedRange`) into two entry points distinguished by input shape: `deleteRange` for explicit ranges and `deleteCollapsed` for collapsed cursors. The `deleteText`/`insertText` import cycle dissolves, `operation.delete` collapses from a 380-line bespoke body into pure dispatch, and four files are removed. Drops the gzipped bundle by ~2 KB.
