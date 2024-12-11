---
editUrl: false
next: false
prev: false
title: 'AddedAnnotationPaths'
---

> **AddedAnnotationPaths**: `object`

## Type declaration

### ~~markDefPath~~

> **markDefPath**: `Path`

:::caution[Deprecated]
An annotation may be applied to multiple blocks, resulting
in multiple `markDef`'s being created. Use `markDefPaths` instead.
:::

### markDefPaths

> **markDefPaths**: `Path`[]

### ~~spanPath~~

> **spanPath**: `Path`

:::caution[Deprecated]
Does not return anything meaningful since an annotation
can span multiple blocks and spans. If references the span closest
to the focus point of the selection.
:::

## Defined in

[packages/editor/src/editor/plugins/createWithEditableAPI.ts:612](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/plugins/createWithEditableAPI.ts#L612)
