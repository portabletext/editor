---
'@portabletext/editor': patch
---

fix: mint a `_key` for keyless blocks instead of rejecting the value

A value containing a block without a `_key` no longer triggers the invalid-value flow. The editor mints a key, renders the value, and emits a `set` patch addressed at the block's actual position.
