---
'@portabletext/editor': patch
---

fix: keep a collaborator's replaced content when undoing a local edit

Undoing a local edit no longer changes content a collaborator replaced it with. If you typed at the end of a span and a collaborator then replaced that span (an `insert` patch with `position: 'replace'`), undo removed characters from the collaborator's text. Undo now skips edits to content a collaborator has replaced.
