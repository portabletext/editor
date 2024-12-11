---
editUrl: false
next: false
prev: false
title: 'BehaviorActionIntendSet'
---

> **BehaviorActionIntendSet**\<`TBehaviorEventType`, `TGuardResponse`\>: (`{

    context,
    event,

}`, `guardResponse`) => [`BehaviorActionIntend`](/api/index/type-aliases/behavioractionintend/)[]

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **TBehaviorEventType** _extends_ [`BehaviorEvent`](/api/index/type-aliases/behaviorevent/)\[`"type"`\] = [`BehaviorEvent`](/api/index/type-aliases/behaviorevent/)\[`"type"`\]

• **TGuardResponse** = `true`

## Parameters

### \{

    context,
    event,

\}

#### context

[`EditorContext`](/api/index/type-aliases/editorcontext/)

#### event

[`PickFromUnion`](/api/index/type-aliases/pickfromunion/)\<[`BehaviorEvent`](/api/index/type-aliases/behaviorevent/), `"type"`, `TBehaviorEventType`\>

### guardResponse

`TGuardResponse`

## Returns

[`BehaviorActionIntend`](/api/index/type-aliases/behavioractionintend/)[]

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:267](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L267)
