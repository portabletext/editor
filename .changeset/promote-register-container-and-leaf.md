---
'@portabletext/editor': minor
---

feat: promote `registerContainer` and `registerLeaf` to the `Editor` type

`registerContainer` and `registerLeaf` are now `@alpha` methods on the
public `Editor` type, returning the unregister function. The internal
`InternalEditor` type is gone, so `useEditor()` returns `Editor` and
`ContainerPlugin` / `LeafPlugin` no longer cast to access these
methods.
