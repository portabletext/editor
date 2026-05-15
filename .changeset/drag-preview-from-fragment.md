---
'@portabletext/editor': patch
---

fix: drag preview matches the dragged fragment

Dragging an image inside a table cell used to lift the ghost element to the table because the underlying DOM lookup deduplicated to the highest ancestor in the selection range. The dragstart handler now derives the preview from the fragment that will land on the clipboard: it clones the DOM nodes that correspond to each top-level block of the fragment, so the ghost reflects what the consumer will receive on drop.
