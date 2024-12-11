---
editUrl: false
next: false
prev: false
title: 'PortableTextEditableProps'
---

> **PortableTextEditableProps**: `Omit`\<`TextareaHTMLAttributes`\<`HTMLDivElement`\>, `"onPaste"` \| `"onCopy"` \| `"onBeforeInput"`\> & `object`

## Type declaration

### hotkeys?

> `optional` **hotkeys**: [`HotkeyOptions`](/api/index/type-aliases/hotkeyoptions/)

### onBeforeInput()?

> `optional` **onBeforeInput**: (`event`) => `void`

#### Parameters

##### event

`InputEvent`

#### Returns

`void`

### onCopy?

> `optional` **onCopy**: [`OnCopyFn`](/api/types/editor/type-aliases/oncopyfn/)

### onPaste?

> `optional` **onPaste**: [`OnPasteFn`](/api/types/editor/type-aliases/onpastefn/)

### rangeDecorations?

> `optional` **rangeDecorations**: [`RangeDecoration`](/api/types/editor/interfaces/rangedecoration/)[]

### ref

> **ref**: `MutableRefObject`\<`HTMLDivElement` \| `null`\>

### renderAnnotation?

> `optional` **renderAnnotation**: [`RenderAnnotationFunction`](/api/types/editor/type-aliases/renderannotationfunction/)

### renderBlock?

> `optional` **renderBlock**: [`RenderBlockFunction`](/api/types/editor/type-aliases/renderblockfunction/)

### renderChild?

> `optional` **renderChild**: [`RenderChildFunction`](/api/types/editor/type-aliases/renderchildfunction/)

### renderDecorator?

> `optional` **renderDecorator**: [`RenderDecoratorFunction`](/api/types/editor/type-aliases/renderdecoratorfunction/)

### renderListItem?

> `optional` **renderListItem**: [`RenderListItemFunction`](/api/types/editor/type-aliases/renderlistitemfunction/)

### renderPlaceholder?

> `optional` **renderPlaceholder**: [`RenderPlaceholderFunction`](/api/types/editor/type-aliases/renderplaceholderfunction/)

### renderStyle?

> `optional` **renderStyle**: [`RenderStyleFunction`](/api/types/editor/type-aliases/renderstylefunction/)

### scrollSelectionIntoView?

> `optional` **scrollSelectionIntoView**: [`ScrollSelectionIntoViewFunction`](/api/types/editor/type-aliases/scrollselectionintoviewfunction/)

### selection?

> `optional` **selection**: [`EditorSelection`](/api/types/editor/type-aliases/editorselection/)

### spellCheck?

> `optional` **spellCheck**: `boolean`

## Defined in

[packages/editor/src/editor/Editable.tsx:92](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/editor/Editable.tsx#L92)
