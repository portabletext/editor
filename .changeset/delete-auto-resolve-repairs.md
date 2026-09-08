---
'@portabletext/editor': patch
---

fix: delete auto-resolve validation repairs in favor of engine normalization

The editor's own normalization now repairs every mechanically fixable defect in a synced value (missing or empty `children`, missing block and child `_key`s), and the repair patches take the engine's shapes: a keyless block gets a minimal `set` on its `_key` field instead of a whole-block `set`, and an empty text block gets its placeholder span as an `insert` before `children[0]`.

Two deltas ride along. Orphaned `markDefs` are no longer pruned when a value enters the editor; they are pruned when a local edit next touches the block, emitted as a `set` of the filtered `markDefs` array. And `InvalidValueResolution.autoResolve` is deprecated and never set: defects the editor can fix itself no longer produce a resolution, so the invalid-value flow only fires for defects that genuinely need a human.
