---
'@portabletext/editor': minor
---

feat: emit `change` events for local and remote changes, with corrections marked

The editor now emits a `change` event, synchronously, every time its content changes. Each event carries the `operations` the editor applied to its content (the public `Operation` type), never the input it received:

```ts
editor.on('change', (event) => {
  if (event.origin === 'local') {
    // `event.patches` is the change as Content Lake patches.
    save(event.patches)
  }
})
```

- `origin: 'local'`: what a user action did, including everything the action's Behaviors raised. Undo and redo are one action each. Local changes arrive in application order, and one user action can produce several when the editor fixes something mid-action. `patches` holds the change as Content Lake patches, the same patches its `mutation` carries, available as soon as the action finishes instead of on the `mutation` event's debounced schedule.
- `origin: 'local'` with `correction: true`: the editor's own fixes to the content, such as merging adjacent spans that share marks after a paste, or replacing a duplicate `_key`. A correction follows the change that caused it, with its own operations and patches. Fixes to content the editor received through `patches` or `update value` are corrections too. A host that saves every local change's `patches` saves corrections as well.
- `origin: 'remote'`: one event per `patches` message and per `update value` that changed the content. Remote changes carry no `patches`.

Loading the initial value emits no `change`, and a `change` never has an empty `operations` array. `ChangeEvent` is exported as a beta type. `EditorEmittedEvent` gains the `change` member, so exhaustive switches over `event.type` gain a case.
