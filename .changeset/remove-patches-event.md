---
'@portabletext/editor': major
---

feat!: replace the `patches` event with `apply`

`editor.send({type: 'apply', patches})` applies patches that came from someone else, such as a collaborator's change arriving from your backend. It replaces the `patches` event, which is removed along with the `PatchesEvent` type.

The patches apply in order as another writer's change. They don't become steps in your undo history, and the caret stays put in text they don't touch. If they change the content, the editor emits one remote `change` event, followed by a `correction: true` change if it had to fix something. An `unset` of the whole value clears the undo history.

Every patch counts as another writer's, so the patches need no `origin` and there is no `snapshot` to pass. If you relayed your own editor's patches back to it marked `origin: 'local'`, stop sending those, since `apply` would apply them a second time.

```ts
// Before
editor.send({type: 'patches', patches: incomingPatches, snapshot})

// After
editor.send({type: 'apply', patches: incomingPatches})
```

The `ApplyEvent` type is exported.
