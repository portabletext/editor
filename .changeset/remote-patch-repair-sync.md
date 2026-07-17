---
'@portabletext/plugin-sdk-value': patch
---

Repair editor divergence after best-effort remote patch application.

Applying remote patches is best-effort: keyed operations produced by another client against a different view of the document (for example both clients splitting the same span to format overlapping ranges) can fail to resolve and are skipped, leaving the editor diverged from the stored document. `ValueSyncPlugin` now follows every remote patch application with a whole-value repair sync, immediately when no local edits are in flight or after the next mutation flush when they are, and escalates to the full value sync machinery when the diff-based repair cannot converge.

The repair diff also no longer emits operations addressing items inside sidecar arrays (`markDefs`, `marks`), which the engine cannot resolve; those are coalesced into whole-property sets taken from the target value.
