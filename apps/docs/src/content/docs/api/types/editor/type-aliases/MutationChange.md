---
editUrl: false
next: false
prev: false
title: 'MutationChange'
---

> **MutationChange**: `object`

The editor has mutated it's content.

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

## Type declaration

### patches

> **patches**: [`Patch`](/api/index/type-aliases/patch/)[]

### snapshot

> **snapshot**: [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[] \| `undefined`

### type

> **type**: `"mutation"`

## Defined in

[packages/editor/src/types/editor.ts:170](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L170)
