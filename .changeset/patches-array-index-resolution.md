---
'@portabletext/patches': patch
---

fix: resolve array indexes in `applyAll` as Sanity does

`applyAll` now reads an array index the way Sanity does. A negative index counts from the end, and a patch aimed at an index outside the array leaves the value unchanged:

```ts
const value = [{_key: 'a'}, {_key: 'b', style: 'normal'}]

applyAll(value, [set('h1', [-1, 'style'])])
// [{_key: 'a'}, {_key: 'b', style: 'h1'}]
// Previously wrote a `-1` property on the array instead

applyAll(value, [unset([-5])])
// [{_key: 'a'}, {_key: 'b', style: 'normal'}]
// Previously removed the first item
```

Every patch type that addresses an item by index is affected:

| Patch | Index | Previously | Now |
| --- | --- | --- | --- |
| `set`, `setIfMissing`, `unset` or `diffMatchPatch` on an item's field | negative | missed the item | changes the item counted from the end |
| `set` of a whole item | negative | missed the item | replaces the item counted from the end |
| `set` or `setIfMissing` of a whole item | past the end | grew the array, padding any gap with `null` | leaves the value unchanged |
| `unset` of a whole item | before the start | removed the first item | leaves the value unchanged |
| `insert` `before` or `after` | outside the array | inserted at a wrapped-around position | leaves the value unchanged |
| `insert` into an empty array | anything but `[0]` or `[-1]` | inserted the items | leaves the value unchanged |

An `insert` into an empty array still lands when it addresses `[0]` or `[-1]`. An `insert` with position `replace`, which `applyAll` does not support, also leaves the value unchanged instead of throwing when its index falls outside the array.
