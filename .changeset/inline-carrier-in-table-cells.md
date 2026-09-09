---
'@portabletext/markdown': patch
---

fix: use the inline `json:object` carrier for objects inside table cells

In `portableTextToMarkdown`, an object inside a table cell that renders through the `json:object` carrier now uses the carrier's single-line inline form instead of a block fence squashed with `<br>`.

In `markdownToPortableText`, a carrier object standing alone in a table cell is placed by the schema: it comes back at block position in the cell (`cell.value`), unless the schema declares the type inline-only, in which case it stays an inline child of the cell's text block. The same placement rule now governs standalone images, so under a schema without a block-level `image`, an image alone in a cell stays inline (reported as `image-block-to-inline`) instead of being lifted to block position.

Together the two sides make objects in table cells survive the serialize-edit-reparse round trip.
