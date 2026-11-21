import type {Path} from '@portabletext/patches'
import type {Node} from '../engine/interfaces/node'
import {isNonArrayObject} from '../utils/is-non-array-object'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {TraversalSnapshot} from './traversal-snapshot'

type Entry = {node: Node; path: Path}

export function everyPath(snapshot: TraversalSnapshot, path: Path) {
  let current: unknown = snapshot.context.value
  let canonical: Path = []
  const nodes: Entry[] = []
  const order: Array<number | undefined> = []
  for (const [segmentIndex, segment] of path.entries()) {
    if (Array.isArray(current)) {
      const index =
        typeof segment === 'number'
          ? segment < 0
            ? current.length + segment
            : segment
          : isKeyedSegment(segment)
            ? current.findIndex(
                (child) =>
                  isNonArrayObject(child) && child['_key'] === segment._key,
              )
            : -1
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return {
          nodes,
          path: [...canonical, ...path.slice(segmentIndex)],
          order,
          found: false,
          invalid:
            typeof segment === 'string' ||
            Array.isArray(segment) ||
            invalidTail(path, segmentIndex),
        }
      }
      order.push(index)
      canonical = [...canonical, arraySegments(current)[index] ?? index]
      current = current[index]
    } else if (isNonArrayObject(current) && typeof segment === 'string') {
      const next = current[segment]
      order.push(Object.keys(current).indexOf(segment))
      if (next === null || typeof next !== 'object') {
        return {
          nodes,
          path: [...canonical, ...path.slice(segmentIndex)],
          order,
          found: true,
          invalid: invalidTail(path, segmentIndex),
        }
      }
      canonical = [...canonical, segment]
      current = next
    } else {
      return {
        nodes,
        path: [...canonical, ...path.slice(segmentIndex)],
        order,
        found: false,
        invalid: true,
      }
    }
    if (isNonArrayObject(current)) {
      nodes.push({node: current as Node, path: canonical})
    }
  }
  return {
    nodes,
    path: canonical,
    order,
    found: isNonArrayObject(current),
    invalid: false,
  }
}

export function everyChildren(
  snapshot: TraversalSnapshot,
  path: Path,
): Entry[] {
  if (path.length === 0) {
    return arrayChildren(snapshot.context.value, [])
  }
  const resolved = everyPath(snapshot, path)
  const entry = resolved.found ? resolved.nodes.at(-1) : undefined
  if (!entry) {
    return []
  }
  return Object.entries(entry.node).flatMap(([field, child]) => {
    const childPath = [...entry.path, field]
    return Array.isArray(child)
      ? arrayChildren(child, childPath)
      : isNonArrayObject(child)
        ? [{node: child as Node, path: childPath}]
        : []
  })
}

export function everyAncestors(
  snapshot: TraversalSnapshot,
  path: Path,
): Entry[] {
  const result = everyPath(snapshot, path)
  if (result.invalid) {
    return []
  }
  return (result.found ? result.nodes.slice(0, -1) : result.nodes).toReversed()
}

export function compareEveryPaths(
  snapshot: TraversalSnapshot,
  first: Path,
  second: Path,
): -1 | 0 | 1 {
  return compareEveryEntries(
    everyPath(snapshot, first),
    everyPath(snapshot, second),
  )
}

export function compareEveryEntries(
  first: {path: Path; order: Array<number | undefined>},
  second: {path: Path; order: Array<number | undefined>},
): -1 | 0 | 1 {
  for (
    let index = 0;
    index < Math.min(first.path.length, second.path.length);
    index++
  ) {
    const firstOrder = first.order[index]
    const secondOrder = second.order[index]
    if (
      firstOrder !== undefined &&
      firstOrder >= 0 &&
      secondOrder !== undefined &&
      secondOrder >= 0
    ) {
      if (firstOrder !== secondOrder) {
        return firstOrder < secondOrder ? -1 : 1
      }
      continue
    }
    const firstSegment = first.path[index]!
    const secondSegment = second.path[index]!
    if (typeof firstSegment === 'number' && typeof secondSegment === 'number') {
      if (firstSegment !== secondSegment) {
        return firstSegment < secondSegment ? -1 : 1
      }
      continue
    }
    const firstFallback = segmentOrderKey(firstSegment)
    const secondFallback = segmentOrderKey(secondSegment)
    if (firstFallback === secondFallback) {
      continue
    }
    return firstFallback < secondFallback ? -1 : 1
  }
  return first.path.length === second.path.length
    ? 0
    : first.path.length < second.path.length
      ? -1
      : 1
}

export function* everyNodes(
  snapshot: TraversalSnapshot,
  at: Path,
  reverse: boolean,
) {
  const resolved = everyPath(snapshot, at)
  const entry =
    resolved.found && !resolved.invalid ? resolved.nodes.at(-1) : undefined
  if (at.length > 0 && !entry) {
    return
  }
  const pending: Array<{value: unknown; path: Path; order: number[]}> = []
  pushEveryChildren(
    pending,
    reverse,
    entry?.node ?? snapshot.context.value,
    entry?.path ?? [],
    resolved.order
      .slice(0, entry?.path.length ?? 0)
      .map((index) => index ?? -1),
  )
  while (pending.length > 0) {
    const current = pending.pop()!
    if (isNonArrayObject(current.value)) {
      yield {
        node: current.value as Node,
        path: current.path,
        order: current.order,
      }
    }
    pushEveryChildren(
      pending,
      reverse,
      current.value,
      current.path,
      current.order,
    )
  }
}

function pushEveryChildren(
  pending: Array<{value: unknown; path: Path; order: number[]}>,
  reverse: boolean,
  value: unknown,
  path: Path,
  order: number[],
) {
  const children = Array.isArray(value)
    ? arraySegments(value).map((segment, index) => ({
        value: value[index],
        path: [...path, segment],
        order: [...order, index],
      }))
    : isNonArrayObject(value)
      ? Object.entries(value).map(([field, child], index) => ({
          value: child,
          path: [...path, field],
          order: [...order, index],
        }))
      : []
  if (!reverse) {
    children.reverse()
  }
  for (const child of children) {
    if (
      child !== undefined &&
      child.value !== null &&
      typeof child.value === 'object'
    ) {
      pending.push(child)
    }
  }
}

function arrayChildren(value: unknown[], path: Path): Entry[] {
  const entries: Entry[] = []
  const pending: Array<{value: unknown; path: Path}> = [{value, path}]
  while (pending.length > 0) {
    const current = pending.pop()!
    if (Array.isArray(current.value)) {
      const segments = arraySegments(current.value)
      for (let index = current.value.length - 1; index >= 0; index--) {
        pending.push({
          value: current.value[index],
          path: [...current.path, segments[index]!],
        })
      }
    } else if (isNonArrayObject(current.value)) {
      entries.push({node: current.value as Node, path: current.path})
    }
  }
  return entries
}

function arraySegments(value: unknown[]): Array<number | {_key: string}> {
  const counts = new Map<unknown, number>()
  for (const child of value) {
    if (isNonArrayObject(child)) {
      counts.set(child['_key'], (counts.get(child['_key']) ?? 0) + 1)
    }
  }
  return value.map((child, index) => {
    const key = isNonArrayObject(child) ? child['_key'] : undefined
    return typeof key === 'string' && key !== '' && counts.get(key) === 1
      ? {_key: key}
      : index
  })
}

function invalidTail(path: Path, from: number): boolean {
  for (let index = from + 1; index < path.length; index++) {
    const previous = path[index - 1]
    const segment = path[index]
    if (
      (typeof previous === 'number' || isKeyedSegment(previous)) &&
      (typeof segment === 'number' || isKeyedSegment(segment))
    ) {
      return true
    }
  }
  return false
}

function segmentOrderKey(segment: Path[number]): string {
  return isKeyedSegment(segment)
    ? `key:${segment._key}`
    : `${typeof segment}:${
        typeof segment === 'string' ? segment : JSON.stringify(segment)
      }`
}
