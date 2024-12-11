---
editUrl: false
next: false
prev: false
title: 'BehaviorGuard'
---

> **BehaviorGuard**\<`TBehaviorEvent`, `TGuardResponse`\>: (`{
  context,
  event,
}`) => `TGuardResponse` \| `false`

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **TBehaviorEvent** _extends_ [`BehaviorEvent`](/api/index/type-aliases/behaviorevent/)

• **TGuardResponse**

## Parameters

### \{

context,
event,
\}

#### context

[`EditorContext`](/api/index/type-aliases/editorcontext/)

#### event

`TBehaviorEvent`

## Returns

`TGuardResponse` \| `false`

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:253](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L253)
