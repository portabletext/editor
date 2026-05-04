---
'@portabletext/editor': patch
---

fix: make `getSelectedValue` and `getSelectedTextBlocks` container-aware

These selectors now return the correct portable text slice when the selection sits inside, spans across, or fully covers an editable container. Copy/cut and any consumer that introspects the selected portion receives the full structure (container shells preserved, partial content trimmed) regardless of depth.
