---
editUrl: false
next: false
prev: false
title: 'BehaviorActionIntend'
---

> **BehaviorActionIntend**: [`SyntheticBehaviorEvent`](/api/index/type-aliases/syntheticbehaviorevent/) \| \{ `annotations`: `object`[]; `decorators`: `string`[]; `text`: `string`; `type`: `"insert.span"`; \} \| \{ `placement`: `"auto"` \| `"after"` \| `"before"`; `textBlock`: \{ `children`: `PortableTextTextBlock`\[`"children"`\]; \}; `type`: `"insert.text block"`; \} \| \{ `listItem`: `string`; `type`: `"list item.add"`; \} \| \{ `listItem`: `string`; `type`: `"list item.remove"`; \} \| \{ `at`: [`KeyedSegment`]; `to`: [`KeyedSegment`]; `type`: `"move.block"`; \} \| \{ `at`: [`KeyedSegment`]; `type`: `"move.block down"`; \} \| \{ `at`: [`KeyedSegment`]; `type`: `"move.block up"`; \} \| \{ `type`: `"noop"`; \} \| \{ `blockPath`: [`KeyedSegment`]; `type`: `"delete.block"`; \} \| \{ `anchor`: [`BlockOffset`](/api/index/type-aliases/blockoffset/); `focus`: [`BlockOffset`](/api/index/type-aliases/blockoffset/); `type`: `"delete.text"`; \} \| \{ `effect`: () => `void`; `type`: `"effect"`; \} \| \{ `type`: `"reselect"`; \} \| \{ `selection`: [`EditorSelection`](/api/types/editor/type-aliases/editorselection/); `type`: `"select"`; \} \| \{ `type`: `"select.previous block"`; \} \| \{ `type`: `"select.next block"`; \} \| \{ `style`: `string`; `type`: `"style.add"`; \} \| \{ `style`: `string`; `type`: `"style.remove"`; \} \| \{ `at`: [`KeyedSegment`]; `level`: `number`; `listItem`: `string`; `style`: `string`; `type`: `"text block.set"`; \} \| \{ `at`: [`KeyedSegment`]; `props`: (`"level"` \| `"listItem"` \| `"style"`)[]; `type`: `"text block.unset"`; \}

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:123](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L123)
