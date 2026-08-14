---
'@portabletext/html': patch
---

fix: scope `createFlattenTableRule`'s row and cell lookup to its own table

A table containing another table in one of its cells was not flattened at all: its cells came through as separate blocks, as if the rule had not been passed. Rows and cells are now read from the table's own `rows` and `cells` collections, so a nested table stays inside the cell that holds it.
