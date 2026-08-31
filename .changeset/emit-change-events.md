---
'@portabletext/editor': minor
---

feat: emit `change` events with the applied operations for local and remote changes

The editor now emits a `change` event for every edit applied to the document. Each event carries the applied operations and an `origin` that tells you whether the edit was made in this editor (`'local'`) or arrived from the outside (`'remote'`). Use it to keep derived state (indexes, anchors, external copies of the value) in sync without diffing the value yourself. Previously only local edits were observable, through the `mutation` event.

```tsx
import {EventListenerPlugin} from '@portabletext/editor/plugins'

<EventListenerPlugin
  on={(event) => {
    if (event.type === 'change' && event.origin === 'remote') {
      for (const operation of event.operations) {
        invalidateBlock(operation.path[0])
      }
    }
  }}
/>
```

Notes:

- `operations` uses the same operation types as the `operation` event: `insert`, `insert.text`, `remove.text`, `set`, and `unset`.
- Local events arrive at the same cadence as `mutation` events. Undo and redo count as local.
- Remote updates emit one event per applied block, in application order. Apply them in that order.
- An `update value` that changes nothing emits nothing.
- The initial value sync also emits a `change`, taking the editor's empty seed document to your configured initial value. If you maintain a copy of the value loaded from storage, start applying events at the `ready` event; otherwise you would re-apply content your copy already has.
- The `operations` array is a fresh copy per event, but the operation objects in it are shared with the editor: treat them as read-only and copy anything you keep around.

New exports: `ChangeEvent`, and the `'change'` member on `EditorEmittedEvent`. Exhaustive switches over emitted event types gain a case.
