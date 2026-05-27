---
'@portabletext/markdown': patch
---

fix: `DefaultTableRenderer` escapes characters that would break a GFM table row

A `|` in a cell's text used to end the cell, causing all cells to the right to shift. A `\n` inside a multi-line block-object (such as a code block) used to end the row, causing all cells after the first line break to be lost. The renderer now escapes literal pipes as `\|` and replaces newlines with `<br>` so every cell in the source Portable Text survives the round-trip through `markdownToPortableText`.
