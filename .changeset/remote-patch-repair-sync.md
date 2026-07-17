---
'@portabletext/plugin-sdk-value': patch
---

Repair editor divergence after best-effort remote patch application, and make the patch channel safe under concurrent formatting.

Applying remote patches is best-effort: keyed operations produced by another client against a different view of the document (for example both clients splitting the same span to format overlapping ranges) can fail to resolve, leaving the editor diverged from the stored document. `ValueSyncPlugin` now follows every remote patch application with a whole-value repair sync, immediately when no local edits are in flight or after the next mutation flush when they are, and escalates to the full value sync machinery when the diff-based repair cannot converge.

Concurrent-editing hardening, validated against a live two-tab harness driving a real Content Lake dataset:

- Remote patches are pre-flight checked against the local editor tree; operations addressing nodes that don't exist locally are dropped and left to the repair sync instead of being sent into the engine where they fail loudly.
- Repair diffs (and incoming patches) addressing items inside sidecar arrays (`markDefs`, `marks`), which the engine cannot resolve, are coalesced into whole-property sets taken from the store value.
- Outgoing `markDefs` whole-array sets are decomposed into item-keyed insert/set/unset operations so two clients' annotations merge at the server instead of overwriting each other, and definitions the stored document still references are never pruned by a diverged client (which orphaned the other client's marks).
- An editor emptied by concurrent deletions writes `set(field, [])` instead of unsetting the whole field, which left other clients unable to reconcile.
- Unconvertible diff paths (array slices such as `marks[1:]`) no longer throw an uncaught error that froze the sync actor; they fall back to the full value sync.
