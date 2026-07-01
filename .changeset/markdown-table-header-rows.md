---
'@portabletext/markdown': patch
---

fix: honor table `headerRows: 0` in Markdown serialization

`portableTextToMarkdown` now respects a table's `headerRows` field. A table with `headerRows: 0` serializes with an empty Markdown header row and every row in the body, instead of silently promoting the first row to the header. `markdownToPortableText` reads an all-empty header row back as `headerRows: 0` (dropping the empty header), so a headerless table round-trips. Tables with `headerRows` of 1 or more are unchanged, the first row is the header; because GFM allows a single header row, values above 1 still flatten to one header on export while the extra rows stay on the Portable Text side.
