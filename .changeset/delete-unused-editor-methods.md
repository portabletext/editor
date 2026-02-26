---
'@portabletext/editor': patch
---

Remove unused internal Slate editor methods (edges, first, fragment, hasBlocks, hasTexts, isEmpty, last). These are internal to the Slate layer and not part of the public PTE API.
