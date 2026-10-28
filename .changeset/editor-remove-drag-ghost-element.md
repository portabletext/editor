---
'@portabletext/editor': patch
---

fix: drag the whole block when it contains `data-pt-drag-ghost-element`

A block with an element marked `data-pt-drag-ghost-element` used to replace the drag image with that element, but the image was placed far away from the pointer and never showed. The attribute is no longer read, so these blocks get the same drag image as any other block.
