---
'@portabletext/editor': patch
---

fix(perf): coalesce `editor.subscribe` notifications to one per microtask burst

The editor's actor emits once per applied operation, so a single action that applies many operations (undoing a large delete, inserting many blocks) notified snapshot subscribers once per operation. `useEditorSelector` (and any `editor.subscribe` consumer) therefore re-ran its selector once per operation; a selector that scans the selection became O(operations × selection) and could freeze the main thread on a large undo.

`editor.subscribe` now coalesces a synchronous burst of transitions into a single `next` with the settled snapshot on the next microtask, the same boundary the editor's render already coalesces to. `useEditorSelector` re-runs its selector once per burst instead of once per operation. The snapshot is cumulative, so the delivered value is unchanged; only intermediate per-operation states within a burst are skipped. A consumer that must observe every operation should use `editor.on('operation', ...)`.
