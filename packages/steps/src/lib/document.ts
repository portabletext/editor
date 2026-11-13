import type {Path} from '@portabletext/patches'
import {isSpan, isTextBlock, type Schema} from '@portabletext/schema'
import type {StepPath} from '../step-mapper'
import {arrayIndex, getArrayKeys, type ArrayKeyCache} from './array-index'
import {isRecord} from './is-record'
import {defaultSchema, schemaForField} from './span'

export {arrayIndex} from './array-index'
export {isRecord} from './is-record'

export function resolvePath(
  root: unknown,
  path: Path,
  cache?: ArrayKeyCache,
): {path: Path; value: unknown; reachable: boolean; numericPath: Path} {
  let value = root
  let reachable = true
  const resolved: Path = []
  const numericPath: Path = []
  for (const segment of path) {
    if (Array.isArray(value)) {
      const index = arrayIndex(value, segment, cache)
      reachable = reachable && index >= 0 && index < value.length
      resolved.push(
        index >= 0 && index < value.length
          ? arraySegment(value, index, cache)
          : segment,
      )
      numericPath.push(index >= 0 && index < value.length ? index : segment)
      value = value[index]
    } else {
      reachable = reachable && typeof segment === 'string' && isRecord(value)
      numericPath.push(segment)
      resolved.push(segment)
      value =
        typeof segment === 'string' && isRecord(value)
          ? value[segment]
          : undefined
    }
  }
  return {path: resolved, value, reachable, numericPath}
}

// Keep in sync with `editor/src/internal-utils/operation-to-patches.ts` and `editor/src/paths/node-segment.ts`.
export function arraySegment(
  value: ReadonlyArray<unknown>,
  index: number,
  cache?: ArrayKeyCache,
): StepPath[number] {
  const item = value[index]
  const key = isRecord(item) ? item['_key'] : undefined
  if (typeof key !== 'string' || key === '') {
    return index
  }
  if (cache) {
    return getArrayKeys(value, cache).counts.get(key) === 1
      ? {_key: key}
      : index
  }
  let count = 0
  for (const sibling of value) {
    if (isRecord(sibling) && sibling['_key'] === key && ++count > 1) {
      return index
    }
  }
  return {_key: key}
}

export function arraySegments(
  value: ReadonlyArray<unknown>,
  cache?: ArrayKeyCache,
): StepPath {
  if (cache) {
    return getArrayKeys(value, cache).segments
  }
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
  textSchema?: Schema,
  cache?: ArrayKeyCache,
): Array<{node: Record<string, unknown>; path: StepPath; text?: string}> {
  const nodes: Array<{
    node: Record<string, unknown>
    path: StepPath
    text?: string
  }> = []
  const pending = [
    {value, path, schema: textSchema, textChildren: false, annotation: false},
  ]
  while (pending.length > 0) {
    const current = pending.pop()!
    if (Array.isArray(current.value)) {
      const segments = arraySegments(current.value, cache)
      for (let index = current.value.length - 1; index >= 0; index--) {
        pending.push({
          ...current,
          value: current.value[index],
          textChildren: current.textChildren && !Array.isArray(current.value[index]),
          path: [...current.path, segments[index]!],
        })
      }
    } else if (isRecord(current.value)) {
      nodes.push({
        node: current.value,
        path: current.path,
        ...(current.schema &&
        current.textChildren &&
        !current.annotation &&
        isSpan({schema: current.schema}, current.value)
          ? {text: current.value.text}
          : {}),
      })
      const entries = Object.entries(current.value)
      for (let index = entries.length - 1; index >= 0; index--) {
        const [field, child] = entries[index]!
        if (typeof child === 'object' && child !== null) {
          pending.push({
            value: child,
            path: [...current.path, field],
            schema: current.schema
              ? schemaForField(current.value, field, current.schema)
              : undefined,
            textChildren:
              field === 'children' &&
              !!current.schema &&
              isTextBlock({schema: current.schema}, current.value),
            annotation: current.annotation || field === 'markDefs',
          })
        }
      }
    }
  }
  return nodes
}

export function collectTextPoints(
  value: unknown,
  schema?: Schema,
  cache: ArrayKeyCache = new WeakMap(),
) {
  return walkNodes(value, [], schema ?? defaultSchema, cache).flatMap(
    ({path, text}) =>
      text === undefined ? [] : [{path, offset: 0, length: text.length}],
  )
}

export function retainArrayKeys(
  before: unknown,
  after: unknown,
  path: Path,
  cache: ArrayKeyCache,
): void {
  for (let depth = 0; depth < path.length; depth++) {
    const segment = path[depth]!
    if (
      Array.isArray(before) &&
      Array.isArray(after) &&
      typeof segment === 'number'
    ) {
      if (
        depth < path.length - 1 &&
        !(depth === path.length - 2 && path[depth + 1] === '_key')
      ) {
        const keys = cache.get(before)
        if (keys) {
          cache.set(after, keys)
        }
      }
      before = before[segment]
      after = after[segment]
    } else if (
      isRecord(before) &&
      isRecord(after) &&
      typeof segment === 'string'
    ) {
      before = before[segment]
      after = after[segment]
    } else {
      return
    }
  }
}
