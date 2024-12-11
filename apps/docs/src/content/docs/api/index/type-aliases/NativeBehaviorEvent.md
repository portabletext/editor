---
editUrl: false
next: false
prev: false
title: 'NativeBehaviorEvent'
---

> **NativeBehaviorEvent**: \{ `data`: `DataTransfer`; `type`: `"copy"`; \} \| \{ `keyboardEvent`: `Pick`\<`KeyboardEvent`, `"key"` \| `"code"` \| `"altKey"` \| `"ctrlKey"` \| `"metaKey"` \| `"shiftKey"`\>; `type`: `"key.down"`; \} \| \{ `keyboardEvent`: `Pick`\<`KeyboardEvent`, `"key"` \| `"code"` \| `"altKey"` \| `"ctrlKey"` \| `"metaKey"` \| `"shiftKey"`\>; `type`: `"key.up"`; \} \| \{ `data`: `DataTransfer`; `type`: `"paste"`; \}

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:96](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L96)
