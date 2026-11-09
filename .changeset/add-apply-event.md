---
'@portabletext/editor': minor
---

feat: add the `apply` event for another writer's change

`editor.send({type: 'apply', patches})` applies patches that came from someone else, such as a collaborator's change arriving from your backend. The patches apply in order as another writer's change. They don't become steps in your undo history, and the caret stays put in text they don't touch. If they change the content, the editor emits one remote `change` event, followed by a `correction: true` change if it had to fix something. An `unset` of the whole value clears the undo history.

```ts
editor.send({type: 'apply', patches: incomingPatches})
```

Every patch counts as another writer's, so the patches need no `origin` and there is no `snapshot` to pass. The `ApplyEvent` type is exported next to `PatchesEvent`.
