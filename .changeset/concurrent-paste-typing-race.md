---
'@portabletext/editor': patch
---

fix: position incoming remote text patches relative to unflushed local edits

Two editors on the same field, editing the same line concurrently, could end up with one editor's text spliced into the middle of the other's. A remote `diffMatchPatch` could fuzzy-match inside text that the receiving editor had just inserted.

The editor now keeps the text before unresolved local edits for each span. Incoming patches select that base or the live text with exact matching, then merge concurrent changes deterministically. The base advances with remote patches until the local change is acknowledged or expires.
