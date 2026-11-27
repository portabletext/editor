---
'@portabletext/editor': minor
---

feat: add `indexMap` to the editor snapshot and deprecate `blockIndexMap`

`EditorSnapshot.indexMap` maps the serialized path of every keyed node, at any depth, to that node's index among its siblings. `blockIndexMap` holds the same map under a name that suggests it only covers blocks. It is now deprecated, and the editor fills both fields with the same `Map` instance, so code reading `blockIndexMap` keeps working. Switch reads to `indexMap`:

```ts
const index = snapshot.indexMap.get('[_key=="b0"].children[_key=="s0"]')
```

Code that builds `EditorSnapshot` objects by hand (for example in tests) needs to set `indexMap` as well.
