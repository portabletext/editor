import type {Behavior} from './behavior.types.behavior'
import type {BehaviorEvent} from './behavior.types.event'

export type BehaviorIndex = {
  global: Array<SortedBehavior>
  namespaced: Map<string, Array<SortedBehavior>>
  exact: Map<string, Array<SortedBehavior>>
}

type SortedBehavior = {
  behavior: Behavior
  sortOrder: number
}

/**
 * Given an array of Behaviors, build a `BehaviorIndex` where the `sortOrder`
 * of each Behavior is preserved.
 */
export function buildBehaviorIndex(behaviors: Array<Behavior>): BehaviorIndex {
  const global: Array<SortedBehavior> = []
  const namespaced = new Map<string, Array<SortedBehavior>>()
  const exact = new Map<string, Array<SortedBehavior>>()

  let sortOrder = -1

  for (const behavior of behaviors) {
    sortOrder++
    const sortedBehavior = {behavior, sortOrder}

    if (behavior.on === '*') {
      global.push(sortedBehavior)
      continue
    }

    if (behavior.on.endsWith('.*')) {
      const namespace = behavior.on.slice(0, -2)
      const indexedBehaviors = namespaced.get(namespace) ?? []

      indexedBehaviors.push(sortedBehavior)

      namespaced.set(namespace, indexedBehaviors)

      continue
    }

    const indexedBehaviors = exact.get(behavior.on) ?? []

    indexedBehaviors.push(sortedBehavior)

    exact.set(behavior.on, indexedBehaviors)
  }

  return {exact, global, namespaced}
}

export function getEventBehaviors(
  behaviorIndex: BehaviorIndex,
  type: BehaviorEvent['type'],
): Array<Behavior> {
  // Catches all events
  const global = behaviorIndex.global

  // Handles scenarios like a Behavior listening for `select.*` and the event
  // `select.block` is fired.
  // OR a Behavior listening for `select.*` and the event `select` is fired.
  const namespace = type.includes('.') ? type.split('.').at(0) : type
  const namespaced = namespace
    ? (behaviorIndex.namespaced.get(namespace) ?? [])
    : []
  const exact = behaviorIndex.exact.get(type) ?? []

  const sorted = [...global, ...namespaced, ...exact].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  return sorted.map((sortedBehavior) => sortedBehavior.behavior)
}
