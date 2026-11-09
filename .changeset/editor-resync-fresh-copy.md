---
'@portabletext/editor': minor
---

feat: resync the editor to a fresh copy with keyed reconciliation at every depth

`editor.send({type: 'resync', value})` hands a ready editor a fresh copy of its value. The editor works out the final content first, then changes what it holds in one pass, and emits one remote `change` if anything moved and none if nothing did. Siblings are matched by `_key` and `_type` at every depth, containers included, so a node that keeps its key keeps its identity and a span's `text` changes by text edits. A range or a caret in text the change left alone keeps its anchor, and one on content that moved to another block is lost rather than left pointing at text that is gone.

Undo and redo history are cleared, even when nothing moved. `undefined` and `[]` both give the empty editor, and content that arrives in the copy is kept as received. Sending `resync` before `ready` throws.
