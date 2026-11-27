---
'@portabletext/editor': patch
---

fix: track the editor's own placeholder by key when sending the first edit

Typing into an empty paragraph that a collaborator added to an empty field no longer sends that paragraph to the host a second time, and an edit that leaves the editor's own empty paragraph unchanged, such as setting its `style` to `normal`, now sends the paragraph before the edit.
