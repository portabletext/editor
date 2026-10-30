---
'@portabletext/editor': minor
---

feat: emit `change` events for local and remote changes, with corrections marked

The editor now emits a `change` event, synchronously, every time its content changes. Each event carries the `operations` the editor applied to its content (the public `Operation` type), never the input it received:

```ts
editor.on('change', (event) => {
  if (event.origin === 'local') {
    // `event.patches` is the change as Sanity patches.
    save(event.patches)
  }
})
```

- `origin: 'local'`: what a user action did, including everything the action's Behaviors raised. Undo and redo are one action each. Local changes arrive in application order, and one user action can produce several when the editor fixes something mid-action. `patches` holds the change as Sanity patches, the same patches the `patch` event emits for the action, available as soon as the action finishes instead of on the `mutation` event's debounced schedule.
- `origin: 'local'` with `correction: true`: the editor's own fixes to the content, such as merging adjacent spans that share marks after a paste, or replacing a duplicate `_key`. A correction follows the change that caused it, with its own operations and patches. Fixes to content the editor received through `patches` or `update value` are corrections too. Registering or unregistering a node with `editor.registerNode` after load can make the editor fix existing content, and those fixes are corrections. A host that saves every local change's `patches` saves corrections as well. A correction to received content arrives even when the editor drops it from `mutation` because a newer value or a conflicting remote patch arrived first. A key or unused mark definition the editor repairs while validating an `update value` is not part of any `change`, and still reaches the host only through `patch` and `mutation`.
- `origin: 'remote'`: one event per `patches` message and per `update value` that changed the content. Remote changes carry no `patches`.

Every `change` of one action is delivered before any `change` that a listener sets off while receiving them. Loading the initial value emits no `change`, except a `correction` when the editor fixes the loaded value, and a `change` never has an empty `operations` array. A long initial value that the editor loads across several ticks counts as one load, so its fixes arrive as one `correction`. `ChangeEvent` is exported as a beta type. `EditorEmittedEvent` gains the `change` member, so exhaustive switches over `event.type` gain a case.

When the DOM selection leaves a read-only editor's content, the editor now deselects through the `select` event with `at: null`, so Behaviors listening to `select` see it.
