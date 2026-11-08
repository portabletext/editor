import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {walkPath} from '../traversal/walk-path'
import {isCustomBehaviorEvent, type BehaviorEvent} from './behavior.types.event'

/**
 * Whether an editor event names a path that cannot address anything. Such
 * an event changes nothing, so no Behavior sees it. A path to a node that
 * is not in the document still reaches Behaviors, which treat it as a hint. The addresses are `at`, `to`, a native
 * event's `position` and `dragOrigin` selections, and the same fields on
 * the native `originEvent` of a (de)serialization event. Custom event
 * payloads belong to their Behaviors and are not inspected.
 */
export function eventHasInvalidAddress(
  snapshot: TraversalSnapshot,
  event: BehaviorEvent,
): boolean {
  if (isCustomBehaviorEvent(event)) {
    return false
  }

  const paths = [
    ...addressPaths(event),
    ...('originEvent' in event && isSerializationEvent(event)
      ? addressPaths(event.originEvent)
      : []),
  ]

  return paths.some((path) => walkPath(snapshot, path).status === 'invalid')
}

function addressPaths(event: object): Array<Path> {
  return [
    ...('at' in event ? selectionPaths(event.at) : []),
    ...('to' in event ? selectionPaths(event.to) : []),
    ...('position' in event ? positionPaths(event.position) : []),
    ...('dragOrigin' in event ? positionPaths(event.dragOrigin) : []),
  ]
}

function isSerializationEvent(event: BehaviorEvent): boolean {
  return (
    event.type === 'deserialize' ||
    event.type === 'deserialize.data' ||
    event.type === 'deserialization.success' ||
    event.type === 'deserialization.failure' ||
    event.type === 'serialize' ||
    event.type === 'serialize.data' ||
    event.type === 'serialization.success' ||
    event.type === 'serialization.failure'
  )
}

function selectionPaths(address: unknown): Array<Path> {
  if (Array.isArray(address)) {
    return [address]
  }

  if (typeof address !== 'object' || address === null) {
    return []
  }

  return [
    ...('anchor' in address ? pointPaths(address.anchor) : []),
    ...('focus' in address ? pointPaths(address.focus) : []),
  ]
}

function positionPaths(position: unknown): Array<Path> {
  return typeof position === 'object' &&
    position !== null &&
    'selection' in position
    ? selectionPaths(position.selection)
    : []
}

function pointPaths(point: unknown): Array<Path> {
  return typeof point === 'object' &&
    point !== null &&
    'path' in point &&
    Array.isArray(point.path)
    ? [point.path]
    : []
}
