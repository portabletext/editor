import type {KeyedSegment, PathSegment} from '@portabletext/patches'
import {isKeyedSegment} from '@portabletext/traversal'
import {isRecord} from './is-record'

export function arrayIndex(
  value: ReadonlyArray<unknown>,
  segment: PathSegment | undefined,
  cache?: ArrayKeyCache,
): number {
  return typeof segment === 'number'
    ? segment < 0
      ? value.length + segment
      : segment
    : isKeyedSegment(segment)
      ? cache
        ? (getArrayKeys(value, cache).firstIndices.get(segment._key) ?? -1)
        : value.findIndex(
            (item) => isRecord(item) && item['_key'] === segment._key,
          )
      : -1
}

export type ArrayKeyCache = WeakMap<ReadonlyArray<unknown>, ArrayKeys>

type ArrayKeys = {
  firstIndices: Map<unknown, number>
  counts: Map<unknown, number>
  segments: Array<number | KeyedSegment>
}

export function getArrayKeys(
  value: ReadonlyArray<unknown>,
  cache: ArrayKeyCache,
): ArrayKeys {
  const cached = cache.get(value)
  if (cached) {
    return cached
  }
  const itemKeys: unknown[] = []
  const firstIndices = new Map<unknown, number>()
  const counts = new Map<unknown, number>()
  for (let index = 0; index < value.length; index++) {
    const item = value[index]
    if (!isRecord(item)) {
      itemKeys.push(undefined)
      continue
    }
    const key = item['_key']
    itemKeys.push(key)
    if (!firstIndices.has(key)) {
      firstIndices.set(key, index)
    }
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const segments = itemKeys.map((key, index) =>
    typeof key === 'string' && key !== '' && counts.get(key) === 1
      ? {_key: key}
      : index,
  )
  const keys = {firstIndices, counts, segments}
  cache.set(value, keys)
  return keys
}
