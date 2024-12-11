---
editUrl: false
next: false
prev: false
title: 'Behavior'
---

> **Behavior**\<`TBehaviorEventType`, `TGuardResponse`\>: `object`

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **TBehaviorEventType** _extends_ [`BehaviorEvent`](/api/index/type-aliases/behaviorevent/)\[`"type"`\] = [`BehaviorEvent`](/api/index/type-aliases/behaviorevent/)\[`"type"`\]

• **TGuardResponse** = `true`

## Type declaration

### actions

> **actions**: [`BehaviorActionIntendSet`](/api/index/type-aliases/behavioractionintendset/)\<`TBehaviorEventType`, `TGuardResponse`\>[]

Array of behavior action sets.

### guard?

> `optional` **guard**: [`BehaviorGuard`](/api/index/type-aliases/behaviorguard/)\<[`PickFromUnion`](/api/index/type-aliases/pickfromunion/)\<[`BehaviorEvent`](/api/index/type-aliases/behaviorevent/), `"type"`, `TBehaviorEventType`\>, `TGuardResponse`\>

Predicate function that determines if the behavior should be executed.
Returning a non-nullable value from the guard will pass the value to the
actions and execute them.

### on

> **on**: `TBehaviorEventType`

The internal editor event that triggers this behavior.

## Defined in

[packages/editor/src/behaviors/behavior.types.ts:227](https://github.com/portabletext/editor/blob/66b5022fc4919e0540c704fbecb8ab8f991c2439/packages/editor/src/behaviors/behavior.types.ts#L227)
