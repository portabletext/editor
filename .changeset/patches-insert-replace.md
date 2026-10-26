---
'@portabletext/patches': patch
---

fix: apply `insert` with position `replace` in `applyAll`

`applyAll` now applies an `insert` patch with position `replace` the way Sanity does: the items take the place of the item at the path. It previously threw `Invalid position "replace"` for every path, even though `InsertPosition` includes `'replace'` and the README documents it.

```ts
const value = [{_key: 'a'}, {_key: 'b'}, {_key: 'c'}]

applyAll(value, [insert([{_key: 'y'}, {_key: 'z'}], 'replace', [{_key: 'b'}])])
// [{_key: 'a'}, {_key: 'y'}, {_key: 'z'}, {_key: 'c'}]
// Previously threw: Invalid position "replace", must be either before or after
```

An empty list of items removes the item. A path to a missing key or an index outside the array leaves the value unchanged, and in an empty array the items land at `[0]` or `[-1]`.
