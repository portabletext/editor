---
editUrl: false
next: false
prev: false
title: 'OnPasteFn'
---

> **OnPasteFn**: (`data`) => [`OnPasteResultOrPromise`](/api/types/editor/type-aliases/onpasteresultorpromise/)

It is encouraged not to return `Promise<undefined>` from the `OnPasteFn` as
a mechanism to fall back to the native paste behaviour. This doesn't work in
all cases. Always return plain `undefined` if possible.

:::caution[Beta]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### data

[`PasteData`](/api/types/editor/interfaces/pastedata/)

## Returns

[`OnPasteResultOrPromise`](/api/types/editor/type-aliases/onpasteresultorpromise/)

## Defined in

[packages/editor/src/types/editor.ts:360](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/types/editor.ts#L360)
