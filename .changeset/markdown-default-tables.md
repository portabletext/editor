---
'@portabletext/markdown': minor
'@portabletext/editor': minor
---

feat: convert GFM tables by default

`markdownToPortableText` now converts GFM pipe tables to a `table` block object out of the box, matching the shape `@portabletext/plugin-table` expects: `headerRows`, an optional `alignment` array, and `rows` of `row` objects holding `cell` objects with a `value` array of Portable Text blocks. This only kicks in when the schema declares a `table` block object with a `rows` field; a schema without that keeps flattening table cells into plain blocks, as before. Pass `types: {table: undefined}` to opt out and flatten regardless.

`portableTextToMarkdown` now renders `table` block objects back to GFM by default too, instead of a fenced JSON block. A value that isn't table-shaped falls back to the fenced JSON rendering. Pass `types: {table: undefined}` to opt out.

`DefaultTableRenderer` now treats a missing or non-positive `headerRows` as headerless, rather than promoting the first row to a header. `markdownToPortableText` always sets `headerRows` explicitly, so converting GFM to Portable Text and back is unaffected.

`@portabletext/editor`'s markdown clipboard converter picks up both defaults: copying a table now puts GFM on the clipboard instead of fenced JSON, and pasting GFM produces `@portabletext/plugin-table`-compatible values when the editor's schema declares `table`.
