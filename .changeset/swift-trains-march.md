---
'@portabletext/markdown': patch
---

fix: handle block elements inside list items

Block elements (code blocks, images, HRs, blockquotes) in list items
now correctly split output and preserve surrounding content. Also
fixes code block fallback when not defined in schema.
