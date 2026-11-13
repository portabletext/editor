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
- `origin: 'local'` with `correction: true`: the editor's own fixes to the content, such as merging adjacent spans that share marks after a paste, or replacing a duplicate `_key`. A correction follows the change that caused it, with its own operations and patches. Fixes to content the editor received through `apply` or `update value` are corrections too. Registering or unregistering a node with `editor.registerNode` after load can make the editor fix existing content, and those fixes are corrections. A host that saves every local change's `patches` saves corrections as well. A correction to received content arrives even when the editor drops it from `mutation` because a newer value or a conflicting remote patch arrived first. When the editor repairs a value it receives, by giving a child without a `_key` a new key, adding an empty span to a text block without children, or removing an unused mark definition, the repair is a correction too, and the remote `change` holds the value as received, without the repair. Every child without a `_key` gets its own key in that correction. Corrections are never held back: a correction to the initial value, or to a value received while the editor is read-only, carries `patches` even though the editor sends no `patch` or `mutation` events for it.
- `origin: 'remote'`: one event per `apply` event and per `update value` that changed the content. When an `operation` listener sends a Behavior event or registers a node while an `update value` is applied, that change is emitted in between, so the `update value` arrives as a remote event before it and another after it. Remote changes carry no `patches`.

Every `change` of one action is delivered before any `change` that a listener sets off while receiving them. Loading the initial value emits no `change`, except a `correction` when the editor fixes the loaded value, and a `change` never has an empty `operations` array. The empty block the editor shows in an empty field is part of the snapshot and never reported, but when the editor puts one back later, because the last block was deleted or another writer unset the field, its insert is in the `operations` of the change that caused it. After a remote unset it arrives as a `correction` with no `patches`, since the field is already gone. A long initial value that the editor loads across several ticks counts as one load, so its fixes arrive as one `correction`. `ChangeEvent` is exported as a beta type. `EditorEmittedEvent` gains the `change` member, so exhaustive switches over `event.type` gain a case.

An `operation` listener now sees a block the editor repairs on arrival as it was received, followed by each repair as its own `insert`. A received text block with three or more children without a `_key` now gets their key patches in index order. When the DOM selection leaves a read-only editor's content, the editor now deselects through the `select` event with `at: null`, so Behaviors listening to `select` see it.
