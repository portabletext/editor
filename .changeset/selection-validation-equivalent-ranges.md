---
'@portabletext/editor': patch
---

fix: keep equivalent DOM selections intact during selection validation

Sweeping a text selection across table cells could log "DOM range out of sync, validating selection" and collapse the selection mid-drag. The validator now recognizes when the browser's selection is an equivalent representation of the editor's selection and leaves it alone instead of rewriting it.
