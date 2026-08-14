---
'@portabletext/editor': major
---

feat!: remove `markDefPath` and `spanPath` from `AddedAnnotationPaths`

`PortableTextEditor.addAnnotation` now returns only `markDefPaths` (document order). `markDefPath` was the focus-span's markDef and `spanPath` was documented as not meaningful. Consumers pick from `markDefPaths`: the first entry matches the old `markDefPath` whenever the annotation covers one block.
