---
'@portabletext/block-tools': patch
---

fix: preserve whitespace in inline spans and handle orphan list items

Fixes two `htmlToBlocks` bugs:

- A space inside an inline `<span>` element (e.g. `a<span> </span>b`) is now preserved instead of being dropped. The whitespace text node rule now checks the parent element's siblings when the text node is the sole child of a `<span>`.
- Orphan `<li>` elements without a `<ul>` or `<ol>` parent are now treated as bullet list items instead of being silently dropped.
