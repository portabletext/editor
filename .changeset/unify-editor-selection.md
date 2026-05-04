---
'@portabletext/editor': minor
---

fix: avoid internal editor selection conversion

The editor used to keep two selection representations in sync: an internal Slate-style selection on `editor`, and a portable text selection on the snapshot. This release drops the internal conversion. Selectors and behaviors read the snapshot's selection directly. `editor.selection` is now the same shape consumers see through `getSnapshot`.
