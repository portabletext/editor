---
editUrl: false
next: false
prev: false
title: 'UndoChange'
---

> **UndoChange**: `object`

The editor performed a undo history step

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

## Type declaration

### patches

> **patches**: [`Patch`](/api/index/type-aliases/patch/)[]

### timestamp

> **timestamp**: `Date`

### type

> **type**: `"undo"`

## Defined in

[packages/editor/src/types/editor.ts:285](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L285)
