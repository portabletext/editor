---
editUrl: false
next: false
prev: false
title: 'Editor'
---

> **Editor**: `object`

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type declaration

### \_internal

> **\_internal**: `object`

#### \_internal.editable

> **editable**: [`EditableAPI`](/api/types/editor/interfaces/editableapi/)

#### \_internal.editorActor

> **editorActor**: `EditorActor`

#### \_internal.slateEditor

> **slateEditor**: `SlateEditor`

### on

> **on**: `ActorRef`\<`Snapshot`\<`unknown`\>, `EventObject`, [`EditorEmittedEvent`](/api/index/type-aliases/editoremittedevent/)\>\[`"on"`\]

### send()

> **send**: (`event`) => `void`

#### Parameters

##### event

[`EditorEvent`](/api/index/type-aliases/editorevent/)

#### Returns

`void`

## Defined in

[packages/editor/src/editor/create-editor.ts:75](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/create-editor.ts#L75)
