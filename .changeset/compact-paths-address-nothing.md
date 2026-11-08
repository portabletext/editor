---
'@portabletext/editor': patch
---

fix: resolve paths with one walk and drop operations that address nothing

A path with two node segments and no field name between them, such as `[{_key: 'b1'}, {_key: 's1'}]` or `[0, 0]`, now addresses nothing at any depth: at the root, inside a container, inside a container inside a container, and inside a block object's own Portable Text field. A Behavior event, a remote patch, a `select` or a range decoration at such a path changes nothing, emits no `patch` and no `change`, and logs nothing. The other patches in the same `apply` event still apply. A `select` at such a path keeps the current selection, and a range decoration with such an endpoint is never listed, rendered or mapped.

An edit at a well-formed path whose key is not in the document also changes nothing and emits nothing. Previously a `set`, `unset` or `insert` at a missing key still emitted a patch, and an `unset` or `insert` at a missing span key logged `Cannot apply an "unset" (node removal) operation at path ... because the node was not found`. The event still reaches Behaviors, and a `select` at a missing key still deselects.

```ts
// Previously edited the first span's text, emitted a patch and a change
editor.send({type: 'set', at: [{_key: 'b1'}, {_key: 's1'}, 'text'], value: 'baz'})
// Previously logged console.error "... because the node was not found"
editor.send({type: 'apply', patches: [{type: 'unset', path: [{_key: 'b1'}, 'children', {_key: 'gone'}], origin: 'remote'}]})
```
