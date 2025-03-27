import type {BehaviorActionSet} from './behavior.types.action'
import type {
  BehaviorEvent,
  BehaviorEventTypeNamespace,
  CustomBehaviorEvent,
  ResolveBehaviorEvent,
} from './behavior.types.event'
import type {BehaviorGuard} from './behavior.types.guard'

/**
 * @beta
 */
export type Behavior<
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] =
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends
    ResolveBehaviorEvent<TBehaviorEventType> = ResolveBehaviorEvent<TBehaviorEventType>,
> = {
  /**
   * Editor Event that triggers this Behavior.
   */
  on: TBehaviorEventType
  /**
   * Predicate function that determines if the Behavior should be executed.
   * Returning a non-nullable value from the guard will pass the value to the
   * actions and execute them.
   */
  guard?: BehaviorGuard<TBehaviorEvent, TGuardResponse>
  /**
   * Array of Behavior Action sets.
   * Each set represents a step in the history stack.
   */
  actions: Array<BehaviorActionSet<TBehaviorEvent, TGuardResponse>>
}

/**
 * @beta
 *
 * @example
 *
 * ```tsx
 * const noLowerCaseA = defineBehavior({
 *   on: 'insert.text',
 *   guard: ({event, snapshot}) => event.text === 'a',
 *   actions: [({event, snapshot}) => [{type: 'insert.text', text: 'A'}]],
 * })
 * ```
 *
 */
export function defineBehavior<
  TPayload extends Record<string, unknown>,
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] = CustomBehaviorEvent['type'],
  TGuardResponse = true,
>(
  behavior: Behavior<
    TBehaviorEventType,
    TGuardResponse,
    ResolveBehaviorEvent<TBehaviorEventType, TPayload>
  >,
): Behavior
export function defineBehavior<
  TPayload extends never = never,
  TBehaviorEventType extends
    | '*'
    | `${BehaviorEventTypeNamespace}.*`
    | BehaviorEvent['type'] = BehaviorEvent['type'],
  TGuardResponse = true,
  TBehaviorEvent extends ResolveBehaviorEvent<
    TBehaviorEventType,
    TPayload
  > = ResolveBehaviorEvent<TBehaviorEventType, TPayload>,
>(
  behavior: Behavior<TBehaviorEventType, TGuardResponse, TBehaviorEvent>,
): Behavior {
  return behavior as unknown as Behavior
}
