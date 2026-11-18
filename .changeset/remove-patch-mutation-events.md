---
'@portabletext/editor': major
---

feat!: remove the `patch` and `mutation` events

The `patch` and `mutation` events and the `MutationEvent` type are removed. Listen to `change`, the editor's only content output. Local `change.patches` are emitted at once, including corrections on load and while the editor is read-only.

Read `editor.getSnapshot().context.value` instead of `mutation.value`. There is no typing debounce. To take a burst of changes at once, listen with `editor.on('change', listener, {batch: true})`, and the listener receives the burst's `change` events as one array. A host that relays local patches to another editor sends each burst in one `apply`, because an edit and the correction it causes, sent apart, can leave the other editor with a different value.

Before:

```ts
editor.on('mutation', (event) => {
  save(event.patches)
})
```

After:

```ts
editor.on('change', (event) => {
  if (event.origin === 'local') {
    save(event.patches)
  }
})
```
