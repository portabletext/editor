# RFC: Homogeneous Action Set Factories

- **Status:** Draft
- **Date:** 2026-01-12

## Abstract

This RFC proposes adding factory functions (`raise`, `execute`, `forward`, `effect`) for creating homogeneous action sets. The old mixed-action style is deprecated but continues to work. This simplifies the Behavior API by encouraging the principle that each action set should have a single purpose.

## Motivation

### You basically never want to mix action types

This is the core insight driving this change. In practice:

- **Mixing `raise` and `execute`** almost never makes sense. If you're raising, you want the event to go through the behavior chain. If you're executing, you want to bypass it. Doing both in the same action set is confusing.

- **Mixing `raise`/`execute` with `forward`** is are. `forward` is typically used alone or with `effect` for side effects.

- **Mixing `raise`/`execute` with `effect`** is the main legitimate case. But even here, these can usually be separate action sets.

By making homogeneous action sets the default API, we codify the principle: **each action set should have a single purpose**.

### Action sets are almost always homogeneous in practice

Looking at the existing behaviors in the codebase, the vast majority use a single action type per action set:

```typescript
// Most behaviors look like this - all raises
actions: [({event}) => [
  raise({type: 'decorator.remove', ...}),
  raise({type: 'decorator.add', ...}),
]]

// Or all executes
actions: [({event}) => [
  execute({type: 'insert.text', text: 'A'}),
]]
```

Mixed action sets are rare and typically only occur in special cases like drag-and-drop where you need to both modify state AND perform DOM side effects.

### The runtime already optimizes for homogeneous action sets

In `behavior.perform-event.ts`, there's optimization logic that detects when all actions in a set are the same type and skips Slate normalization between them. The new API makes this common pattern explicit and first-class, rather than something the runtime has to detect.

### Clearer intent at the call site

With the current API, you must scan the entire action array to understand what kind of dispatch is happening:

```typescript
// Current: What kind of dispatch? Have to read every line
actions: [
  ({event}) => [
    raise({type: 'foo'}),
    raise({type: 'bar'}),
    raise({type: 'baz'}),
  ],
]
```

With the new API, intent is declared upfront:

```typescript
// New: Immediately clear this is all raises
actions: [raise(({event}) => [{type: 'foo'}, {type: 'bar'}, {type: 'baz'}])]
```

### Reduced boilerplate

Each event no longer needs to be wrapped in `raise()` or `execute()`:

```typescript
// Current: wrap every event
actions: [
  ({event}) => [
    raise({type: 'move.forward', distance: 1}),
    raise({type: 'split'}),
    raise({type: 'insert.text', text: '\n'}),
  ],
]

// New: just return plain events
actions: [
  raise(({event}) => [
    {type: 'move.forward', distance: 1},
    {type: 'split'},
    {type: 'insert.text', text: '\n'},
  ]),
]
```

### Better type inference and safety

Each factory function can constrain which event types are valid:

- `raise()` only accepts `SyntheticBehaviorEvent | CustomBehaviorEvent`
- `execute()` only accepts `SyntheticBehaviorEvent`
- `forward()` accepts any event type

This provides better compile-time feedback when you accidentally use the wrong action type for an event.

### Simpler mental model

The distinction between `raise` vs `execute` vs `forward` is subtle and important for understanding event flow and history behavior. Making this a top-level declaration rather than per-event reduces cognitive load:

- "This action set raises events" (triggers behavior chain, may create history step)
- "This action set executes events" (bypasses behaviors, direct mutation)
- "This action set forwards events" (continues to next behavior)

## Detailed Design

### New API

```typescript
import {
  defineBehavior,
  effect,
  execute,
  forward,
  raise,
} from '@portabletext/editor'

defineBehavior({
  on: 'decorator.toggle',
  actions: [
    raise(({event, snapshot}, guardResponse) => [
      {type: 'decorator.remove', decorator: event.decorator},
      {type: 'decorator.add', decorator: event.decorator},
    ]),
  ],
})

// forward takes a function like raise/execute
defineBehavior({
  on: 'keyboard.keydown',
  actions: [forward(({event}) => [event])],
})

// effect keeps current signature
defineBehavior({
  on: 'custom.async',
  actions: [
    effect(({send}) => {
      setTimeout(() => send({type: 'custom.done'}), 100)
    }),
  ],
})
```

### Function Overloading

Each factory function is overloaded to support both the new style (preferred) and old style (deprecated):

```typescript
// New style (preferred) - returns action set
export function raise<T, G>(
  fn: (payload: ActionSetPayload<T>, guardResponse: G) => Array<RaiseableEvent>,
): RaiseActionSet<T, G>

// Old style (deprecated) - returns single action
/** @deprecated Use `raise(() => [event])` instead */
export function raise(event: RaiseableEvent): BehaviorAction

// Implementation
export function raise(eventOrFn: RaiseableEvent | Function) {
  if (typeof eventOrFn === 'function') {
    return {type: 'raise set', fn: eventOrFn}
  }
  return {type: 'raise', event: eventOrFn}
}
```

The same pattern applies to `execute` and `forward`:

```typescript
// execute
export function execute<T, G>(fn: ...): ExecuteActionSet<T, G>
/** @deprecated */ export function execute(event: ExecutableEvent): BehaviorAction

// forward
export function forward<T, G>(fn: ...): ForwardActionSet<T, G>
/** @deprecated */ export function forward(event: ForwardableEvent): BehaviorAction
```

The `effect` function doesn't need overloading since its signature is already a function:

```typescript
export function effect(
  fn: (payload: {send: (event: ExternalBehaviorEvent) => void}) => void,
): EffectActionSet {
  return {type: 'effect set', fn}
}
```

### New Type Definitions

```typescript
// New homogeneous action set types
export type RaiseActionSet<TEvent, TGuard> = {
  type: 'raise set'
  fn: (
    payload: ActionSetPayload<TEvent>,
    guardResponse: TGuard,
  ) => Array<RaiseableEvent>
}

export type ExecuteActionSet<TEvent, TGuard> = {
  type: 'execute set'
  fn: (
    payload: ActionSetPayload<TEvent>,
    guardResponse: TGuard,
  ) => Array<ExecutableEvent>
}

export type ForwardActionSet<TEvent, TGuard> = {
  type: 'forward set'
  fn: (
    payload: ActionSetPayload<TEvent>,
    guardResponse: TGuard,
  ) => Array<ForwardableEvent>
}

export type EffectActionSet = {
  type: 'effect set'
  fn: (payload: {send: (event: ExternalBehaviorEvent) => void}) => void
}

/**
 * @deprecated Use factory functions (`raise()`, `execute()`, `forward()`, `effect()`) instead.
 */
type LegacyActionSet<TEvent, TGuard> = (
  payload: ActionSetPayload<TEvent>,
  guardResponse: TGuard,
) => Array<BehaviorAction>

export type BehaviorActionSet<TEvent, TGuard> =
  | LegacyActionSet<TEvent, TGuard> // @deprecated
  | RaiseActionSet<TEvent, TGuard>
  | ExecuteActionSet<TEvent, TGuard>
  | ForwardActionSet<TEvent, TGuard>
  | EffectActionSet
```

### Execution Logic Changes

The executor in `behavior.perform-event.ts` handles both legacy and new styles:

```typescript
function isTypedActionSet(actionSet: BehaviorActionSet): boolean {
  return typeof actionSet === 'object' && 'type' in actionSet
}

// In the action set execution loop:
if (isTypedActionSet(actionSet)) {
  switch (actionSet.type) {
    case 'raise set':
      const raiseEvents = actionSet.fn(payload, guardResponse)
      for (const event of raiseEvents) {
        performEvent({event, mode: 'raise', ...})
      }
      break
    case 'execute set':
      // ... similar
      break
    case 'forward set':
      // ... similar
      break
    case 'effect set':
      actionSet.fn({send})
      break
  }
} else {
  // Legacy style (deprecated)
  const actions = actionSet(payload, guardResponse)
  // ... existing logic to handle mixed BehaviorAction array
}
```

## Deprecation

The following are marked `@deprecated`:

### Legacy Action Set Style

```typescript
// @deprecated
actions: [({event}) => [raise({type: 'foo'}), execute({type: 'bar'})]]
```

### Single-Event Action Creators

The old action creators that wrap a single event are deprecated since the new factory functions return plain events:

```typescript
// @deprecated - use raise(() => [{type: 'foo'}]) instead
raise({type: 'foo'})

// @deprecated - use execute(() => [{type: 'foo'}]) instead
execute({type: 'foo'})

// @deprecated - use forward(() => [event]) instead
forward(event)
```

## Drawbacks

### Two Ways to Do the Same Thing

During the deprecation period, there will be two ways to define action sets. This could cause confusion. However:

- The `@deprecated` tag provides clear guidance
- IDEs will show warnings when using the old style
- Documentation will only show the new style

## Open Challenges

### Type Inference Limitation

The proposed factory function approach has a significant TypeScript limitation: **generic type inference happens at the call site, not from contextual typing**.

In the current (legacy) style, the callback IS the action set:

```typescript
actions: [({event}) => [...]]
//         ^^^^^ TypeScript infers event type from BehaviorActionSet<TBehaviorEvent, ...>
```

TypeScript can infer `event`'s type because the callback is directly typed as `BehaviorActionSet<TBehaviorEvent, TGuardResponse>`, where `TBehaviorEvent` flows from the behavior's `on` property.

In the proposed style, the callback is wrapped by a factory function:

```typescript
actions: [raise(({event}) => [...])]
//              ^^^^^ event is unknown!
```

When `raise(fn)` is called, TypeScript must infer its generic parameters (`TBehaviorEvent`, `TGuardResponse`) from the arguments. Since `fn` is just a function with no type hints, the generics become `unknown`. The contextual typing from the `actions` array type arrives too late - after the generics have already been inferred.

**Workarounds considered:**

1. **Default type parameters** - Setting defaults like `TBehaviorEvent = BehaviorEvent` makes `event` the full union of all event types, losing the specific typing that makes the current API useful.

2. **Explicit type parameters** - Requiring `raise<MyEventType, true>(...)` is verbose and defeats the ergonomic benefits.

3. **Object literals instead of factory calls** - Writing `{type: 'raise set', fn: ({event}) => [...]}` would get contextual typing, but is more verbose than the current style.

This limitation means the proposed API would have weaker type safety than the current style for the `event` parameter.

## Alternative: Builder Pattern

An alternative approach that preserves type inference is a builder/chaining pattern:

```typescript
// Current style
defineBehavior({
  on: 'insert.text',
  guard: ({event}) => event.text === 'a',
  actions: [({event}) => [raise({type: 'insert.text', text: 'A'})]],
})

// Builder style
defineBehavior({
  on: 'insert.text',
  guard: ({event}) => event.text === 'a',
}).raise(({event}) => [{type: 'insert.text', text: event.text.toUpperCase()}])
```

This works because:

1. `defineBehavior({on: 'insert.text', ...})` establishes `TBehaviorEvent`
2. The returned builder's `.raise()` method inherits those generics
3. The callback gets proper contextual typing

**Multiple action sets:**

```typescript
defineBehavior({on: 'decorator.toggle', guard: ...})
  .raise(({event}) => [{type: 'decorator.remove', decorator: event.decorator}])
  .raise(({event}) => [{type: 'decorator.add', decorator: event.decorator}])
```

**Mixed types:**

```typescript
defineBehavior({on: 'drag.dragstart', guard: ...})
  .raise(({event}) => [{type: 'select', at: ...}])
  .effect(({send}) => { /* set drag ghost */ })
  .forward(({event}) => [event])
```

### Builder Pattern Trade-offs

**Pros:**

- Preserves full type inference for `event`
- Clear visual separation of action sets
- Each method call explicitly declares the action type

**Cons:**

- Significant API change from the current object-based style
- Behaviors that only stop an event (no actions) look potentially unfinished:
  ```typescript
  defineBehavior({on: 'insert.text', guard: ...})
  // No chaining - is this intentional or incomplete?
  ```
- Chaining style is less common in configuration-style APIs
- Would need to decide how to handle the "no actions" case (implicit, or explicit `.stop()` method?)

## Alternatives Considered

### Breaking Change (Remove Old Style)

Remove the old style entirely. Rejected because:

- Unnecessarily breaks existing code
- Deprecation provides a smoother migration path

## Implementation Plan

### Files to Modify

1. `packages/editor/src/behaviors/behavior.types.action.ts` - Add new action set types
2. `packages/editor/src/behaviors/behavior.types.behavior.ts` - Update BehaviorActionSet union
3. `packages/editor/src/behaviors/behavior.perform-event.ts` - Handle new action set types in executor
4. `packages/editor/src/behaviors/index.ts` - Export new factory functions, mark old action creators as `@deprecated`

### Verification

1. `pnpm check:types` - Ensure type definitions compile
2. `pnpm test:unit` - Verify migrated behaviors work
3. `pnpm test:browser` - Full integration test
4. Tests for:
   - `raise(() => [...])` action sets
   - `execute(() => [...])` action sets
   - `forward(() => [...])` action sets
   - `effect(() => {...})` action sets
   - Type inference in factory functions

## Unresolved Questions

1. **How to solve the type inference limitation?** The factory function approach loses type inference for `event`. The builder pattern solves this but is a significant API change. Are there other approaches worth exploring?

2. **Is the builder pattern acceptable?** It's a departure from the current configuration-object style. Need to evaluate whether the type safety benefits outweigh the API change.

3. **How to handle "stop event" behaviors in the builder pattern?** Behaviors with no actions could either be implicit (no chaining) or explicit (e.g., `.stop()` method). Which is clearer?

4. **Should we pursue this change at all?** The current API works and has good type inference. The motivations (clearer intent, reduced boilerplate) may not justify the complexity of solving the typing issues.
