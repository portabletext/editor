---
'@portabletext/editor': patch
---

fix: address nodes by `_key` in emitted patch paths

Operations raised with numeric path segments now emit patches that address blocks and children by `_key` instead of by array index. For example, removing an inline object by index:

```ts
editor.send({type: 'unset', at: [0, 'children', 1]})
```

This previously emitted `{type: 'unset', path: [0, 'children', 1]}` and now emits:

```ts
{type: 'unset', path: [{_key: 'b1'}, 'children', {_key: 'io1'}]}
```

Keyed paths keep pointing at the intended node when concurrent edits shift array positions. This applies to `set`, `unset`, `insert`, `insert.text` and `remove.text`. An index is kept when the array element has no unique, non-empty `_key` or when the array holds non-object items, such as a span's `marks`.
