---
'@portabletext/editor': patch
---

fix: return `false` from `isBlock` and `isInline` when the path names no node

`isBlock` and `isInline` from `@portabletext/editor/traversal` now return `false` for any path where `hasNode` is `false`, matching the empty value every other lookup returns there. Previously `isBlock` answered `true` for a key that isn't in the document, a missing node inside a container, the empty path, and a path into a block object's own data. `isInline` answered `true` for a missing span or a missing annotation key on a text block.

With a document holding a text block `b1` (with a link annotation `link1`) and an image `image1`:

```ts
const snapshot = editor.getSnapshot()

// Each previously returned `true`
isBlock(snapshot, [{_key: 'missing'}])
isBlock(snapshot, [])
isBlock(snapshot, [{_key: 'image1'}, 'caption', 0])
isInline(snapshot, [{_key: 'b1'}, 'children', {_key: 'missing'}])
isInline(snapshot, [{_key: 'b1'}, 'markDefs', {_key: 'missing'}])
```

A path to an annotation that does exist, such as `[{_key: 'b1'}, 'markDefs', {_key: 'link1'}]`, also makes `isInline` return `false` now instead of `true`, matching `getNode` and `hasNode`, which find no node there. Use `getAnnotation` to look up the annotation itself.
