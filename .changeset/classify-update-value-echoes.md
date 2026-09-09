---
'@portabletext/editor': patch
---

fix: classify `update value` echoes by the editor's own emitted values

After clearing a field, an empty block the host genuinely persisted is no longer re-inserted (duplicate `_key`) by the next keystroke. Blocks a collaborator creates through `patches` count as persisted content on the first local edit, not the editor's own placeholder. And a genuinely persisted empty block is no longer removed when a collaborator's root `insert` arrives right after the editor's own clear.
