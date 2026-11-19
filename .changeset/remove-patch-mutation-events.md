---
'@portabletext/editor': major
---

feat!: remove the `patch` and `mutation` events

The `patch` and `mutation` events and the `MutationEvent` type are removed. Listen to `change` instead. Local `change.patches` are emitted at once, including fixes on load and while the editor is read-only.

Read `editor.getSnapshot().context.value` instead of `mutation.value`. There is no typing debounce. To take a burst of changes at once, listen with `editor.on('change', listener, {batch: true})`, and the listener receives the burst's `change` events as one array. To relay local patches to another editor, send each local `change`'s `patches` in order. With `{batch: true}`, you can send a whole burst in one `apply` by concatenating the local events' patches in order.

Before:

```ts
editor.on('mutation', (event) => {
  publish(event.patches)
})
```

After:

```ts
editor.on('change', (event) => {
  if (event.origin === 'local') {
    publish(event.patches)
  }
})
```
