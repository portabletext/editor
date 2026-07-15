---
'@portabletext/editor': patch
'@portabletext/plugin-sdk-value': patch
---

fix: crash-proof concurrent value sync against divergent live trees

Builds on the engine routing fix in #2974 (which stops remote sidecar-array
patches — `span.marks[n]`, `block.markDefs[_key==...]` — from being routed
through structural child insertion/removal, the root cause of the sync-killing
`unset` throw and the bogus-`children` document corruption). This changeset adds
the residual client-side resilience so a divergent live tree degrades safely
instead of crashing:

- `@portabletext/editor`: keyed `updateBlock` unsets are guarded against the
  live engine tree, and the `updateValue` try/catch is widened so a stale-key
  removal degrades to a safe re-sync instead of surfacing an unhandled rejection
  that freezes the sync actor. Some of the per-`updateBlock` unset guards now
  overlap with the engine fix in #2974 and are kept as defense-in-depth.
- `@portabletext/plugin-sdk-value`: `arrayifyPath` returns `null` instead of
  throwing on diff-patch paths it cannot convert (e.g. array slices produced
  when clearing multiple `marks`); `convertPatches` drops the unconvertible ops
  and flags the batch incomplete, and `applySync` then falls back to an
  authoritative full value update / resync.

Together this stops the crash and the document corruption. It does NOT fix the
underlying SDK concurrency clobber (two editors racing on the same block can
still overwrite each other's changes); that remains to be addressed separately.
