---
editUrl: false
next: false
prev: false
title: 'RangeDecoration'
---

A range decoration is a UI affordance that wraps a given selection range in the editor
with a custom component. This can be used to highlight search results,
mark validation errors on specific words, draw user presence and similar.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### component()

> **component**: (`props`) => `ReactElement`\<`any`, `string` \| `JSXElementConstructor`\<`any`\>\>

A component for rendering the range decoration.
The component will receive the children (text) of the range decoration as its children.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### props

###### children

`ReactNode`

#### Returns

`ReactElement`\<`any`, `string` \| `JSXElementConstructor`\<`any`\>\>

#### Example

```ts
(rangeComponentProps: PropsWithChildren) => (
   <SearchResultHighlight>
     {rangeComponentProps.children}
   </SearchResultHighlight>
 )
```

#### Defined in

[packages/editor/src/types/editor.ts:521](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L521)

---

### onMoved()?

> `optional` **onMoved**: (`details`) => `void`

A optional callback that will be called when the range decoration potentially moves according to user edits.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### details

[`RangeDecorationOnMovedDetails`](/api/types/editor/interfaces/rangedecorationonmoveddetails/)

#### Returns

`void`

#### Defined in

[packages/editor/src/types/editor.ts:529](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L529)

---

### payload?

> `optional` **payload**: `Record`\<`string`, `unknown`\>

A custom payload that can be set on the range decoration

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Defined in

[packages/editor/src/types/editor.ts:533](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L533)

---

### selection

> **selection**: [`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

The editor content selection range

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Defined in

[packages/editor/src/types/editor.ts:525](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L525)
