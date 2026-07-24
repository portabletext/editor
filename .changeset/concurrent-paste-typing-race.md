---
'@portabletext/editor': patch
---

fix: position incoming remote text patches relative to unflushed local edits

Two editors on the same field, editing the same line concurrently, could end up with one editor's text spliced into the middle of the other's. This happened because a remote `diffMatchPatch` patch was fuzzy-matched against the receiving editor's live, already-locally-edited text, which could match inside a local edit's own inserted or deleted text rather than around it.

The editor now tracks its own unflushed `insert.text`/`remove.text` operations per span. When a remote patch arrives for a span with such edits pending, it diffs against the text as it stood before those local edits, then maps the resulting change forward through them, placing it correctly relative to the local edit instead of inside it.
