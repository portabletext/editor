---
'@portabletext/editor': patch
---

fix: emit structural repair patches immediately and make engine normalization the sole repairer

Opening a document whose value contains structurally invalid content (blocks or children without a `_key`, missing or empty `children` arrays, duplicate keys) now emits the fixing patches as soon as the value settles. Previously they were held back until the first local edit. Read-only editors emit them too: individual patches relay immediately regardless of read-only state, since a host mirroring them for display has nothing to reject. Mutations, the debounced batches hosts persist, wait for the editor to become editable before delivering, because a host following the documented `onChange` contract rejects mutations against a read-only document; a held mutation that a newer snapshot supersedes is dropped instead of delivered late, and pending mutations are handed over on unmount instead of dropped, so an edit typed just before a read-only flip and unmount is never lost. A block missing its `_key` is repaired like any other mechanical defect instead of triggering the invalid-value flow, which now only fires for defects that need a human, with resolution paths anchored at the defective block's actual position.

The repair patches take the editor's own shapes: a minted `_key` is a minimal `set` on the `_key` field, an empty text block gets its placeholder span as an `insert` before `children[0]`, and all repair patches carry `origin: 'local'`. Orphaned `markDefs` are no longer pruned when a value enters the editor; they are pruned when a local edit next touches the block, as a `set` of the filtered `markDefs` array. `InvalidValueResolution.autoResolve` is deprecated and never set.
