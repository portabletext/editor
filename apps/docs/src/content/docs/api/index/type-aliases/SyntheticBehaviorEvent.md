---
editUrl: false
next: false
prev: false
title: 'SyntheticBehaviorEvent'
---

> **SyntheticBehaviorEvent**: \{ `annotation`: \{ `name`: `string`; `value`: \{\}; \}; `type`: `"annotation.add"`; \} \| \{ `annotation`: \{ `name`: `string`; \}; `type`: `"annotation.remove"`; \} \| \{ `annotation`: \{ `name`: `string`; `value`: \{\}; \}; `type`: `"annotation.toggle"`; \} \| \{ `type`: `"blur"`; \} \| \{ `decorator`: `string`; `type`: `"decorator.add"`; \} \| \{ `decorator`: `string`; `type`: `"decorator.remove"`; \} \| \{ `decorator`: `string`; `type`: `"decorator.toggle"`; \} \| \{ `type`: `"delete.backward"`; `unit`: `TextUnit`; \} \| \{ `type`: `"delete.forward"`; `unit`: `TextUnit`; \} \| \{ `type`: `"focus"`; \} \| \{ `blockObject`: \{ `name`: `string`; `value`: \{\}; \}; `placement`: `"auto"` \| `"after"` \| `"before"`; `type`: `"insert.block object"`; \} \| \{ `inlineObject`: \{ `name`: `string`; `value`: \{\}; \}; `type`: `"insert.inline object"`; \} \| \{ `type`: `"insert.break"`; \} \| \{ `type`: `"insert.soft break"`; \} \| \{ `options`: `TextInsertTextOptions`; `text`: `string`; `type`: `"insert.text"`; \} \| \{ `listItem`: `string`; `type`: `"list item.toggle"`; \} \| \{ `style`: `string`; `type`: `"style.toggle"`; \}

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:11](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L11)
