---
'@portabletext/editor': patch
---

fix: move prop range decorations in read-only editors

Prop range decorations now follow remote document changes while the editor is read-only, so presence carets and other decorations do not become stale in viewers.
