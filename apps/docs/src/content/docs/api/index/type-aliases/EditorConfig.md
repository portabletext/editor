---
editUrl: false
next: false
prev: false
title: 'EditorConfig'
---

> **EditorConfig**: `object` & \{ `schema`: `undefined`; `schemaDefinition`: [`SchemaDefinition`](/api/index/type-aliases/schemadefinition/); \} \| \{ `schema`: `ArraySchemaType`\<[`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)\> \| `ArrayDefinition`; `schemaDefinition`: `undefined`; \}

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type declaration

### behaviors?

> `optional` **behaviors**: [`Behavior`](/api/index/type-aliases/behavior/)[]

### initialValue?

> `optional` **initialValue**: [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

### keyGenerator()?

> `optional` **keyGenerator**: () => `string`

#### Returns

`string`

### maxBlocks?

> `optional` **maxBlocks**: `number`

### readOnly?

> `optional` **readOnly**: `boolean`

## Defined in

[packages/editor/src/editor/create-editor.ts:33](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/create-editor.ts#L33)
