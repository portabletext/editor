---
editUrl: false
next: false
prev: false
title: 'InvalidValueResolution'
---

> **InvalidValueResolution**: `object`

The editor has invalid data in the value that can be resolved by the user

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

## Type declaration

### action

> **action**: `string`

### autoResolve?

> `optional` **autoResolve**: `boolean`

### description

> **description**: `string`

### i18n

> **i18n**: `object`

i18n keys for the description and action

These are in addition to the description and action properties, to decouple the editor from
the i18n system, and allow usage without it. The i18n keys take precedence over the
description and action properties, if i18n framework is available.

#### i18n.action

> **action**: \`inputs.portable-text.invalid-value.$\{Lowercase\<string\>\}.action\`

#### i18n.description

> **description**: \`inputs.portable-text.invalid-value.$\{Lowercase\<string\>\}.description\`

#### i18n.values?

> `optional` **values**: `Record`\<`string`, `string` \| `number` \| `string`[]\>

### item

> **item**: [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[] \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/) \| [`PortableTextChild`](/api/index/type-aliases/portabletextchild/) \| `undefined`

### patches

> **patches**: [`Patch`](/api/index/type-aliases/patch/)[]

## Defined in

[packages/editor/src/types/editor.ts:252](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L252)
