---
'@portabletext/editor': minor
---

feat: add a `batch` option to `editor.on` to coalesce event bursts

`editor.on(type, listener, options)` now accepts `{batch}`:

```ts
editor.on('operation', (events) => recomputeFromSnapshot(editor.getSnapshot()), {
  batch: true,
})
```

With `batch: true`, a synchronous burst of matching events coalesces into a
single listener call on the next microtask, and the listener receives
`Array<Event>`: every event of the burst, in delivery order, with nothing
dropped. A single user action emits one event per underlying operation, so a
listener that reacts per event runs O(operations) times (quadratic when it
also scans the selection); coalescing collapses that burst to one call while
still handing the listener every event, so it can both recompute once and
inspect what happened (e.g. "did any structural operation occur?").

The default (no `batch`, or `batch: false`) is unchanged: the listener runs
synchronously for every event and receives a single `Event`.
