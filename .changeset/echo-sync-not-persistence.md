---
'@portabletext/editor': patch
---

fix: emit reliable patches after clearing the editor

Deleting all content makes the editor emit an `unset` patch that removes the entire value. Typing again then emitted patches that assumed the value still existed. Applying those patches dropped the typed text, or threw `Cannot apply deep operations on primitive values`.

The editor now first emits patches that create the value again: `setIfMissing`, an `insert` of the block, then the text changes. Deleting all content again emits `unset` again.
