---
'@portabletext/markdown': patch
---

fix: `DefaultTableRenderer` always emits a valid GFM table

The first row is always rendered as the header, followed by the delimiter row, followed by the remaining rows as body. The `headerRows` field on the Portable Text table is ignored on serialization so that the emitted Markdown round-trips through any GFM parser. Tables with no rows render as an empty string.
