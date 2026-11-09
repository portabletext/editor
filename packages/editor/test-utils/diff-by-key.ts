import {
  diffMatchPatch,
  insert,
  set,
  unset,
  type Patch,
  type Path,
} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'

type Value = Array<PortableTextBlock> | undefined

/**
 * The smallest keyed change that takes `shown` to `wanted`. Lists are
 * lined up key by key, and only items without a key unique on both sides
 * are replaced by position. An object that
 * keeps its `_type` is changed field by field, and a span's `text` changes
 * as a `diffMatchPatch`, so the editor keeps its undo history and caret
 * across the change.
 */
export function diffValue(shown: Value, wanted: Value): Array<Patch> {
  if (isEqual(shown, wanted)) {
    return []
  }

  if (wanted === undefined) {
    return [unset([])]
  }

  if (shown === undefined) {
    return [set(wanted, [])]
  }

  return diffList(shown, wanted, [])
}

function diffList(
  shown: Array<unknown>,
  wanted: Array<unknown>,
  path: Path,
): Array<Patch> {
  const shownKeys = shown.map(keyOf)
  const wantedKeys = wanted.map(keyOf)

  if (!hasUniqueKeys(shownKeys) || !hasUniqueKeys(wantedKeys)) {
    return diffPartlyKeyedList(shown, wanted, path)
  }

  if (shown.length === 0) {
    return [insert(wanted, 'before', [...path, 0])]
  }

  const staying = new Set(longestCommonRun(shownKeys, wantedKeys))
  const itemPath = (key: string): Path => [...path, {_key: key}]
  const firstStaying = wantedKeys.find((key) => staying.has(key))

  if (firstStaying === undefined) {
    return [
      ...(wanted.length > 0
        ? [insert(wanted, 'before', itemPath(shownKeys[0]!))]
        : []),
      ...shownKeys.map((key) => unset(itemPath(key))),
    ]
  }

  const removals = shownKeys
    .filter((key) => !staying.has(key))
    .map((key) => unset(itemPath(key)))
  const inserts = wanted.flatMap((item, index) => {
    if (staying.has(wantedKeys[index]!)) {
      return []
    }

    const previousKey = wantedKeys[index - 1]

    return previousKey === undefined
      ? [insert([item], 'before', itemPath(firstStaying))]
      : [insert([item], 'after', itemPath(previousKey))]
  })
  const changes = wanted.flatMap((item, index) => {
    const key = wantedKeys[index]!

    return staying.has(key)
      ? diffItem(shown[shownKeys.indexOf(key)], item, itemPath(key))
      : []
  })

  return [...removals, ...inserts, ...changes]
}

/**
 * A list where some items can't be told apart by key: no `_key`, or one
 * shared with another item on either side. Items with a key that is unique
 * on both sides are still matched by key. The rest are matched by position
 * between them and addressed by index, which is exact because the list is
 * built left to right: every item before index `position` is already final
 * when a patch at `position` applies.
 */
function diffPartlyKeyedList(
  shown: Array<unknown>,
  wanted: Array<unknown>,
  path: Path,
): Array<Patch> {
  const shownKeys = shown.map(keyOf)
  const wantedKeys = wanted.map(keyOf)
  const shownCounts = countKeys(shownKeys)
  const wantedCounts = countKeys(wantedKeys)
  const isIdentifiable = (
    key: string | undefined,
    counts: Map<string, number>,
    otherCounts: Map<string, number>,
  ): key is string =>
    key !== undefined &&
    counts.get(key) === 1 &&
    (otherCounts.get(key) ?? 0) <= 1
  const inShown = (key: string | undefined): key is string =>
    isIdentifiable(key, shownCounts, wantedCounts)
  const inWanted = (key: string | undefined): key is string =>
    isIdentifiable(key, wantedCounts, shownCounts)

  if (!shownKeys.some(inShown) && !wantedKeys.some(inWanted)) {
    return [set(wanted, path)]
  }

  const staying = new Set(
    longestCommonRun(
      shownKeys.filter(
        (key): key is string => inShown(key) && wantedCounts.has(key),
      ),
      wantedKeys.filter(
        (key): key is string => inWanted(key) && shownCounts.has(key),
      ),
    ),
  )
  const itemPath = (key: string): Path => [...path, {_key: key}]
  const removals = shownKeys
    .filter((key): key is string => inShown(key) && !staying.has(key))
    .map((key) => unset(itemPath(key)))
  const working = shown
    .map((item, index) => ({item, key: shownKeys[index]}))
    .filter(({key}) => !inShown(key) || staying.has(key))

  const patches: Array<Patch> = [...removals]
  const keyedChanges: Array<Patch> = []
  let cursor = 0
  let position = 0
  let length = working.length

  for (const [index, item] of wanted.entries()) {
    const key = wantedKeys[index]

    if (key !== undefined && staying.has(key)) {
      while (working[cursor]?.key !== key) {
        patches.push(unset([...path, position]))
        cursor++
        length--
      }

      keyedChanges.push(...diffItem(working[cursor]!.item, item, itemPath(key)))
      cursor++
      position++
      continue
    }

    const next = working[cursor]

    if (!inWanted(key) && next !== undefined && !staying.has(next.key ?? '')) {
      if (!isEqual(next.item, item)) {
        patches.push(set(item, [...path, position]))
      }

      cursor++
      position++
      continue
    }

    const previousKey = wantedKeys[index - 1]

    if (inWanted(key) && index > 0 && inWanted(previousKey)) {
      patches.push(insert([item], 'after', itemPath(previousKey)))
    } else if (
      inWanted(key) &&
      next?.key !== undefined &&
      staying.has(next.key)
    ) {
      patches.push(insert([item], 'before', itemPath(next.key)))
    } else if (position < length || length === 0) {
      patches.push(insert([item], 'before', [...path, position]))
    } else {
      patches.push(insert([item], 'after', [...path, position - 1]))
    }

    length++
    position++
  }

  for (; cursor < working.length; cursor++) {
    patches.push(unset([...path, position]))
  }

  return [...patches, ...keyedChanges]
}

function countKeys(keys: Array<string | undefined>): Map<string, number> {
  const counts = new Map<string, number>()

  for (const key of keys) {
    if (key !== undefined) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return counts
}

function diffItem(shown: unknown, wanted: unknown, path: Path): Array<Patch> {
  if (isEqual(shown, wanted)) {
    return []
  }

  if (
    !isPlainObject(shown) ||
    !isPlainObject(wanted) ||
    shown['_type'] !== wanted['_type']
  ) {
    return [set(wanted, path)]
  }

  const patches: Array<Patch> = []

  for (const field of Object.keys(shown)) {
    if (!Object.hasOwn(wanted, field)) {
      patches.push(unset([...path, field]))
    }
  }

  for (const [field, wantedField] of Object.entries(wanted)) {
    const shownField = shown[field]
    const fieldPath = [...path, field]

    if (isEqual(shownField, wantedField)) {
      continue
    }

    if (
      field === 'text' &&
      wanted['_type'] === 'span' &&
      typeof shownField === 'string' &&
      typeof wantedField === 'string'
    ) {
      patches.push(diffMatchPatch(shownField, wantedField, fieldPath))
    } else if (Array.isArray(shownField) && Array.isArray(wantedField)) {
      patches.push(...diffList(shownField, wantedField, fieldPath))
    } else if (isPlainObject(shownField) && isPlainObject(wantedField)) {
      patches.push(...diffItem(shownField, wantedField, fieldPath))
    } else {
      patches.push(set(wantedField, fieldPath))
    }
  }

  return patches
}

function keyOf(item: unknown): string | undefined {
  return isPlainObject(item) &&
    typeof item['_key'] === 'string' &&
    item['_key'] !== ''
    ? item['_key']
    : undefined
}

function hasUniqueKeys(keys: Array<string | undefined>): keys is Array<string> {
  return (
    keys.every((key) => key !== undefined) && new Set(keys).size === keys.length
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function longestCommonRun(
  keysA: Array<string>,
  keysB: Array<string>,
): Array<string> {
  const lengths = Array.from({length: keysA.length + 1}, () =>
    Array.from({length: keysB.length + 1}, () => 0),
  )

  for (let indexA = keysA.length - 1; indexA >= 0; indexA--) {
    for (let indexB = keysB.length - 1; indexB >= 0; indexB--) {
      lengths[indexA]![indexB] =
        keysA[indexA] === keysB[indexB]
          ? lengths[indexA + 1]![indexB + 1]! + 1
          : Math.max(
              lengths[indexA + 1]![indexB]!,
              lengths[indexA]![indexB + 1]!,
            )
    }
  }

  const run: Array<string> = []
  let indexA = 0
  let indexB = 0

  while (indexA < keysA.length && indexB < keysB.length) {
    if (keysA[indexA] === keysB[indexB]) {
      run.push(keysA[indexA]!)
      indexA++
      indexB++
    } else if (lengths[indexA + 1]![indexB]! >= lengths[indexA]![indexB + 1]!) {
      indexA++
    } else {
      indexB++
    }
  }

  return run
}

function isEqual(valueA: unknown, valueB: unknown): boolean {
  if (valueA === valueB) {
    return true
  }

  if (
    typeof valueA !== 'object' ||
    typeof valueB !== 'object' ||
    valueA === null ||
    valueB === null ||
    Array.isArray(valueA) !== Array.isArray(valueB)
  ) {
    return false
  }

  const keysA = Object.keys(valueA)
  const keysB = Object.keys(valueB)

  return (
    keysA.length === keysB.length &&
    keysA.every(
      (key) =>
        Object.hasOwn(valueB, key) &&
        isEqual(Reflect.get(valueA, key), Reflect.get(valueB, key)),
    )
  )
}
