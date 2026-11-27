---
'@portabletext/patches': patch
---

fix: apply index range paths in `applyAll`

An `unset`, `set` or `insert` whose path ends in an index range, such as `items[1:3]` (`[[1, 3]]`) or `items[1:]` (`[[1, '']]`), now changes the items the range covers, as Sanity does. So does a `set` one field below the range, such as `items[1:3].title`. Previously `applyAll` left the array unchanged, so a host mirroring patches with it drifted from the stored document.

```ts
const items = [{_key: 'a'}, {_key: 'b'}, {_key: 'c'}, {_key: 'd'}]

applyAll(items, [{type: 'unset', path: [[1, 3]]}])
// [{_key: 'a'}, {_key: 'd'}] (previously unchanged)
```

`unset` removes the covered items, `set` applies to each covered item, and `insert` places its items before the first covered item, after the last one, or in place of the whole range. The start is inclusive and the end exclusive, `''` leaves a side open, negative bounds count from the end, and bounds clamp to the array. A range that covers nothing, including a reversed one such as `[3, 1]`, leaves the array unchanged. Other patch types at a range, and ranges deeper in the path, still leave the array unchanged.
