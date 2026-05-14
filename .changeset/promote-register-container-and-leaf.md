---
'@portabletext/editor': minor
---

feat: promote `registerContainer`, `registerLeaf`, and `registerTextBlock` to the `Editor` type

`registerContainer`, `registerLeaf`, and `registerTextBlock` are now `@alpha` methods on the public `Editor` type, returning the unregister function. The internal `InternalEditor` type is gone, so `useEditor()` returns `Editor` and `ContainerPlugin` / `LeafPlugin` / `TextBlockPlugin` no longer cast to access these methods.
