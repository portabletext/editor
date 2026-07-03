---
'@portabletext/plugin-table': minor
---

feat(plugin-table): arrow navigation escapes the table when nothing lies beyond

`ArrowDown` from any bottom-row cell and `ArrowUp` from any top-row cell now exit the table: into the neighboring block when one exists, entering at the caret's horizontal position, or by inserting an empty text block beyond the table and moving the caret into it when nothing lies there. Previously the caret could walk sideways through the edge row's cells or get stuck inside the table.
