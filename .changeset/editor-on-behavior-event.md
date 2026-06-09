---
'@portabletext/editor': minor
---

feat: emit behavior events from `editor.on`

Behavior events flowing through the chain are now emitted on `editor.on`. Subscribe to a single event type by name:

```ts
editor.on('drag.dragover', (event) => {
  console.log('drag.dragover at', event.position)
})
editor.on('insert.text', (event) => {
  console.log('insert.text:', event.text)
})
```

`editor.on('*', listener)` and `EventListenerPlugin` see behavior events alongside the existing emitted events.

The tap fires once per behavior event, before the behavior chain runs. Observers see user intent regardless of whether a high-priority handler decides to swallow it.
