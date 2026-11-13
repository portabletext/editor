import type {Path, PathSegment} from '@portabletext/patches'
import type {StepPath} from '../step-mapper'
import {isKeyedSegment} from './is-keyed-segment'

export function resolvePath(
  root: unknown,
  path: Path,
): {path: Path; value: unknown; reachable: boolean} {
  let value = root
  let reachable = true
  const resolved: Path = []
  for (const segment of path) {
    if (Array.isArray(value)) {
      const index = arrayIndex(value, segment)
      reachable = reachable && index >= 0 && index < value.length
      resolved.push(
        index >= 0 && index < value.length
          ? arraySegments(value)[index]!
          : segment,
      )
      value = value[index]
    } else {
      reachable = reachable && typeof segment === 'string' && isRecord(value)
      resolved.push(segment)
      value =
        typeof segment === 'string' && isRecord(value)
          ? value[segment]
          : undefined
    }
  }
  return {path: resolved, value, reachable}
}

export function arrayIndex(
  value: ReadonlyArray<unknown>,
  segment: PathSegment | undefined,
): number {
  return typeof segment === 'number'
    ? segment < 0
      ? value.length + segment
      : segment
    : isKeyedSegment(segment)
      ? value.findIndex(
          (item) => isRecord(item) && item['_key'] === segment._key,
        )
      : -1
}

export function arraySegments(value: ReadonlyArray<unknown>): StepPath {
  const keys = value.map((item) => (isRecord(item) ? item['_key'] : undefined))
  const counts = new Map<unknown, number>()
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return keys.map((key, index) =>
    typeof key === 'string' && key !== '' && counts.get(key) === 1
      ? {_key: key}
      : index,
  )
}

export function walkNodes(
  value: unknown,
  path: StepPath = [],
): Array<{node: Record<string, unknown>; path: StepPath}> {
  const nodes: Array<{node: Record<string, unknown>; path: StepPath}> = []
  visit(value, path, nodes)
  return nodes
}

export function collectTextPoints(value: unknown) {
  return walkNodes(value).flatMap(({node, path}) =>
    typeof node['text'] === 'string'
      ? [{path, offset: 0, length: node['text'].length}]
      : [],
  )
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function visit(
  value: unknown,
  path: StepPath,
  nodes: Array<{node: Record<string, unknown>; path: StepPath}>,
): void {
  if (Array.isArray(value)) {
    const segments = arraySegments(value)
    value.forEach((child, index) =>
      visit(child, [...path, segments[index]!], nodes),
    )
  } else if (isRecord(value)) {
    nodes.push({node: value, path})
    for (const [field, child] of Object.entries(value)) {
      if (typeof child === 'object' && child !== null) {
        visit(child, [...path, field], nodes)
      }
    }
  }
}
