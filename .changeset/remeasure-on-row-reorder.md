---
'@portabletext/plugin-table': patch
---

fix: re-measure chrome geometry when rows or columns are reordered

Moving a row (or column) of a different size than its neighbors left the
gutter dots, handles, and lanes at their old positions: the reorder swaps
offsets without resizing any element, so nothing triggered a re-measure.
The chrome now re-measures whenever the table's row or cell order changes.
