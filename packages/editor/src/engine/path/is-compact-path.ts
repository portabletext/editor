import {
  isCustomBehaviorEvent,
  type BehaviorEvent,
} from '../../behaviors/behavior.types.event'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

/**
 * Whether a path is compact: two node segments (numbers or keyed
 * segments) side by side anywhere in it, e.g. `[0, 0]` or
 * `[{_key:'b1'}, {_key:'s1'}]` instead of `[0, 'children', 0]`. A compact
 * path addresses nothing.
 */
export function isCompactPath(path: Path): boolean {
  for (let index = 1; index < path.length; index++) {
    if (isNodeSegment(path[index - 1]) && isNodeSegment(path[index])) {
      return true
    }
  }

  return false
}

/**
 * Whether an operation carries a compact path anywhere: its own `path`,
 * or a selection point it sets.
 */
export function operationHasCompactPath(operation: EngineOperation): boolean {
  if (operation.type !== 'set.selection') {
    return isCompactPath(operation.path)
  }

  return selectionHasCompactPath(operation.newProperties)
}

/**
 * Whether either point of a selection carries a compact path.
 */
export function selectionHasCompactPath(
  selection: {anchor?: {path: Path}; focus?: {path: Path}} | null,
): boolean {
  return (
    (selection?.anchor !== undefined && isCompactPath(selection.anchor.path)) ||
    (selection?.focus !== undefined && isCompactPath(selection.focus.path))
  )
}

/**
 * Whether one of the editor's own events carries a compact path in an
 * address field: `at` (a path, or a range whose points carry paths), `to`,
 * the selection of a native event's `position` or `dragOrigin`, or those
 * of the native event a (de)serialization event carries as `originEvent`.
 * A custom event's payload belongs to its sender and is never read.
 */
export function eventHasCompactPath(event: BehaviorEvent): boolean {
  if (isCustomBehaviorEvent(event)) {
    return false
  }

  return (
    addressFieldsHaveCompactPath(event) ||
    ('originEvent' in event &&
      isSerializationEvent(event) &&
      addressFieldsHaveCompactPath(event.originEvent))
  )
}

function addressFieldsHaveCompactPath(event: object): boolean {
  return (
    ('at' in event && addressHasCompactPath(event.at)) ||
    ('to' in event && addressHasCompactPath(event.to)) ||
    ('position' in event && positionHasCompactPath(event.position)) ||
    ('dragOrigin' in event && positionHasCompactPath(event.dragOrigin))
  )
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

function addressHasCompactPath(address: unknown): boolean {
  if (Array.isArray(address)) {
    return isCompactPath(address)
  }

  if (typeof address !== 'object' || address === null) {
    return false
  }

  return (
    ('anchor' in address && pointHasCompactPath(address.anchor)) ||
    ('focus' in address && pointHasCompactPath(address.focus))
  )
}

function positionHasCompactPath(position: unknown): boolean {
  return (
    typeof position === 'object' &&
    position !== null &&
    'selection' in position &&
    addressHasCompactPath(position.selection)
  )
}

function pointHasCompactPath(point: unknown): boolean {
  return (
    typeof point === 'object' &&
    point !== null &&
    'path' in point &&
    Array.isArray(point.path) &&
    isCompactPath(point.path)
  )
}

function isNodeSegment(segment: Path[number] | undefined): boolean {
  return isKeyedSegment(segment) || typeof segment === 'number'
}
