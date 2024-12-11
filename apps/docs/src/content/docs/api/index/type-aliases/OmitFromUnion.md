---
editUrl: false
next: false
prev: false
title: 'OmitFromUnion'
---

> **OmitFromUnion**\<`TUnion`, `TTagKey`, `TOmittedTags`\>: `TUnion` _extends_ `Record`\<`TTagKey`, `TOmittedTags`\> ? `never` : `TUnion`

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **TUnion**

• **TTagKey** _extends_ keyof `TUnion`

• **TOmittedTags** _extends_ `TUnion`\[`TTagKey`\]

## Defined in

[packages/editor/src/type-utils.ts:13](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/type-utils.ts#L13)
