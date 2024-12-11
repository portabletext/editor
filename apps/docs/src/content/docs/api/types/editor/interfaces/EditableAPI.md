---
editUrl: false
next: false
prev: false
title: 'EditableAPI'
---

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### activeAnnotations()

> **activeAnnotations**: () => `PortableTextObject`[]

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`PortableTextObject`[]

#### Defined in

[packages/editor/src/types/editor.ts:44](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L44)

---

### addAnnotation()

> **addAnnotation**: \<`TSchemaType`\>(`type`, `value`?) => `undefined` \| \{ `markDefPath`: `Path`; `markDefPaths`: `Path`[]; `spanPath`: `Path`; \}

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### type

`TSchemaType`

##### value?

#### Returns

`undefined` \| \{ `markDefPath`: `Path`; `markDefPaths`: `Path`[]; `spanPath`: `Path`; \}

#### Defined in

[packages/editor/src/types/editor.ts:46](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L46)

---

### blur()

> **blur**: () => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:52](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L52)

---

### delete()

> **delete**: (`selection`, `options`?) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### selection

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

##### options?

[`EditableAPIDeleteOptions`](/api/types/editor/interfaces/editableapideleteoptions/)

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:53](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L53)

---

### findByPath()

> **findByPath**: (`path`) => [`undefined` \| `PortableTextSpan` \| `PortableTextObject` \| `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>, `undefined` \| `Path`]

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### path

`Path`

#### Returns

[`undefined` \| `PortableTextSpan` \| `PortableTextObject` \| `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>, `undefined` \| `Path`]

#### Defined in

[packages/editor/src/types/editor.ts:57](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L57)

---

### findDOMNode()

> **findDOMNode**: (`element`) => `undefined` \| `Node`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### element

`PortableTextSpan` | `PortableTextObject` | `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>

#### Returns

`undefined` \| `Node`

#### Defined in

[packages/editor/src/types/editor.ts:60](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L60)

---

### focus()

> **focus**: () => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:63](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L63)

---

### focusBlock()

> **focusBlock**: () => `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)

#### Defined in

[packages/editor/src/types/editor.ts:64](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L64)

---

### focusChild()

> **focusChild**: () => `undefined` \| [`PortableTextChild`](/api/index/type-aliases/portabletextchild/)

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`undefined` \| [`PortableTextChild`](/api/index/type-aliases/portabletextchild/)

#### Defined in

[packages/editor/src/types/editor.ts:65](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L65)

---

### getFragment()

> **getFragment**: () => `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Defined in

[packages/editor/src/types/editor.ts:67](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L67)

---

### getSelection()

> **getSelection**: () => [`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Defined in

[packages/editor/src/types/editor.ts:66](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L66)

---

### getValue()

> **getValue**: () => `undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`undefined` \| [`PortableTextBlock`](/api/index/type-aliases/portabletextblock/)[]

#### Defined in

[packages/editor/src/types/editor.ts:68](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L68)

---

### hasBlockStyle()

> **hasBlockStyle**: (`style`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### style

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:69](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L69)

---

### hasListStyle()

> **hasListStyle**: (`listStyle`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### listStyle

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:70](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L70)

---

### insertBlock()

> **insertBlock**: \<`TSchemaType`\>(`type`, `value`?) => `Path`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### type

`TSchemaType`

##### value?

#### Returns

`Path`

#### Defined in

[packages/editor/src/types/editor.ts:71](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L71)

---

### insertBreak()

> **insertBreak**: () => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:79](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L79)

---

### insertChild()

> **insertChild**: \<`TSchemaType`\>(`type`, `value`?) => `Path`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### type

`TSchemaType`

##### value?

#### Returns

`Path`

#### Defined in

[packages/editor/src/types/editor.ts:75](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L75)

---

### isAnnotationActive()

> **isAnnotationActive**: (`annotationType`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### annotationType

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:45](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L45)

---

### isCollapsedSelection()

> **isCollapsedSelection**: () => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:80](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L80)

---

### isExpandedSelection()

> **isExpandedSelection**: () => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:81](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L81)

---

### isMarkActive()

> **isMarkActive**: (`mark`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### mark

`string`

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:82](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L82)

---

### isSelectionsOverlapping()

> **isSelectionsOverlapping**: (`selectionA`, `selectionB`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### selectionA

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

##### selectionB

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:83](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L83)

---

### isVoid()

> **isVoid**: (`element`) => `boolean`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### element

`PortableTextSpan` | `PortableTextObject` | `PortableTextTextBlock`\<`PortableTextSpan` \| `PortableTextObject`\>

#### Returns

`boolean`

#### Defined in

[packages/editor/src/types/editor.ts:87](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L87)

---

### marks()

> **marks**: () => `string`[]

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`string`[]

#### Defined in

[packages/editor/src/types/editor.ts:88](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L88)

---

### redo()

> **redo**: () => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:89](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L89)

---

### removeAnnotation()

> **removeAnnotation**: \<`TSchemaType`\>(`type`) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Type Parameters

• **TSchemaType** _extends_ `object`

#### Parameters

##### type

`TSchemaType`

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:90](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L90)

---

### select()

> **select**: (`selection`) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### selection

[`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:93](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L93)

---

### toggleBlockStyle()

> **toggleBlockStyle**: (`blockStyle`) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### blockStyle

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:94](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L94)

---

### toggleList()

> **toggleList**: (`listStyle`) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### listStyle

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:95](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L95)

---

### toggleMark()

> **toggleMark**: (`mark`) => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### mark

`string`

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:96](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L96)

---

### undo()

> **undo**: () => `void`

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:97](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L97)
