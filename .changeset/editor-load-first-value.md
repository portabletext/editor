---
'@portabletext/editor': minor
---

feat: load the first value with `load`

Send `load` from a plugin's mount effect to put the first value into the editor before `ready`. The last `load` in that commit wins. `undefined` and `[]` give an empty editor. Sending `load` after `ready` throws.

```ts
editor.send({type: 'load', value})
```

Loading adds no undo step and emits no edit. Corrections to the received value are emitted as `change` events with `correction: true`, including patches that remove non-object entries from registered child arrays and text blocks’ `children` and `markDefs` arrays. String entries in span `marks` arrays remain intact.
