---
'@portabletext/editor': patch
---

fix: escape a container at the document edge like block objects

When a container (a table, a callout) is the document's first or last block, the caret could get trapped inside it: arrow navigation at the container's edge was suppressed, and clicking the editable's whitespace beyond the container had no block to land in. Both now behave like they already did for block objects: a bare ArrowUp/ArrowDown at the trapped edge, or a click beyond the lonely container, inserts an empty text block outside it and moves the caret there.
