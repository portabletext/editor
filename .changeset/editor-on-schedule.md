---
'@portabletext/editor': minor
---

feat: add a `schedule` option to `editor.on` to coalesce event bursts

`editor.on(type, listener, options)` now accepts `{schedule}`:

```ts
editor.on('*', () => recomputeFromSnapshot(editor.getSnapshot()), {
  schedule: 'microtask',
})
```

With `schedule: 'microtask'`, a synchronous burst of matching events coalesces
into a single trailing listener call on the next microtask, receiving the last
event of the burst. This is for listeners that recompute derived state from
`editor.getSnapshot()` rather than acting on each event: a single user action
emits one event per underlying operation, so reacting per event runs the
listener O(operations) times (quadratic when the listener also scans the
selection). The editor state is never lost, the snapshot is cumulative, only
the intermediate event objects of the burst are not delivered.

The default, `schedule: 'sync'`, is unchanged: the listener runs synchronously
for every event. Also exports the `EditorEventListenerOptions` type.
