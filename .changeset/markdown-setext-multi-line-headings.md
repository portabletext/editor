---
'@portabletext/markdown': patch
---

fix: write an `h1` or `h2` with a hard break as a setext heading when the document parses back unchanged

`portableTextToMarkdown` now writes an `h1` or `h2` whose text holds a line break as a setext heading (`foo  \nbar\n===`), so reading the markdown back gives the same heading instead of a heading plus a paragraph.
