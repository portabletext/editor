---
'@portabletext/editor': patch
---

fix: rebuild a synced-in value before edits emitted while the field is unset

After the editor's own `unset` removed the whole field, a host could sync a value back in without patches (a reconnect refetch racing the in-flight `unset`, for example), leaving the editor showing content its emitted stream had destroyed. Edits then emitted deep patches into the missing field, which patch-applying stores dropped silently or failed on: text typed after such a resurrection never reached the document. The first edit now emits `setIfMissing` and an `insert` of the editor's visible blocks ahead of its own patches, the same rebuild an emptied editor already emits, so the store is rebuilt to match what the user sees before the edit lands on it.

One additional change: a store that unexpectedly still holds the field when the rebuild arrives ends up with the re-inserted blocks alongside its existing ones. The rebuild is additive on purpose: duplicated content is recoverable, overwritten content is not.
