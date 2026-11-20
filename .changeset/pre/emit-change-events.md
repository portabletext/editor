---
'@portabletext/editor': minor
---

feat: emit `change` events for local and remote changes

The editor now emits a `change` event, synchronously, every time its content changes. Each event carries the `operations` the editor applied to its content (the public `Operation` type), never the input it received:

```ts
editor.on('change', (event) => {
  if (event.origin === 'local') {
    // Send `event.patches` to your backend.
    publish(event.patches)
  }
})
```

- `origin: 'local'`: one event for a user action, including everything the action's Behaviors raised and any fixes it caused, such as merging adjacent spans that share marks after a paste. Undo and redo are one action each. Operations and patches stay in application order. `patches` holds the change as Sanity patches, available as soon as the action finishes. A fix that no user action caused is its own local change. That covers fixes after loading the value, after a value arrives through `apply` (also while the editor is read-only), and after registering or unregistering a node with `editor.registerNode`. When the editor repairs a value it receives, every child without a `_key` gets a new `_key`, and a text block without children gets an empty span. The remote `change` holds the value as received, without the repair. A fix's `patches` are emitted at once, without waiting for the editor to become editable.
- `origin: 'remote'`: one event per `apply` event that changed the content. Remote changes carry no `patches`.

A remote `change` and the local `change` that fixes it are delivered before any `change` that a listener sets off while receiving them. A local `change` is too. Loading the initial value emits no `change`, except a local change when the editor fixes the loaded value, and a `change` never has an empty `operations` array. The empty block the editor shows in an empty field is part of the snapshot and never reported, but when the editor puts one back later, because the last block was deleted or another writer unset the field, its insert is in the `operations` of the change that caused it. After a remote unset it arrives as a local change with `patches: []`, since the field is already gone. `ChangeEvent` is exported as a beta type. `EditorEmittedEvent` gains the `change` member, so exhaustive switches over `event.type` gain a case.

An `operation` listener now sees a block the editor repairs on arrival as it was received, followed by each repair as its own operation. A child without a `_key` gets its key through a `set` operation. An `operation` listener sees that `set` with the origin of the received content, so `remote` for a loaded or applied value. The `set` itself is in a local `change`. When the DOM selection leaves a read-only editor's content, the editor now deselects through the `select` event with `at: null`, so Behaviors listening to `select` see it.
