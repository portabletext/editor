---
'@portabletext/editor': minor
---

feat: add `buffer` option to `editor.on` for buffered microtask delivery

`editor.on(type, listener, {schedule: 'microtask', buffer: true})` delivers the array of every matching event coalesced during the microtask burst, in delivery order, instead of the single trailing event that plain `{schedule: 'microtask'}` delivers. Use it when the listener must inspect the whole burst (for example, "did any structural operation occur?") rather than only the latest event.

The buffered listener's argument is `Array<Event>` instead of a single `Event`. The new exported type is `BufferedEditorEventListenerOptions`.
