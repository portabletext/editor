import {applyPatches, parsePatch} from '@sanity/diff-match-patch'
import {
  getIndexForKey,
  jsonMatch,
  slicePath,
  stringifyPath,
  type SingleValuePath,
} from '@sanity/json-match'

/**
 * Test-only port of the patch-operation applier in `@sanity/sdk`
 * (`packages/core/src/document/patchOperations.ts`), which itself mirrors
 * Content Lake behavior. The two-client browser tests use it so the mock
 * server applies transactions with real server semantics (json-match path
 * resolution, unresolvable paths as no-ops, fixed operation order) instead
 * of a forgiving best-effort applier.
 */

/**
 * One Sanity patch as produced by `convertPatchesToSanity` or
 * `@sanity/diff-patch`'s `diffValue`.
 */
export type SanityPatchOperationRecord = {
  set?: {[path: string]: unknown}
  setIfMissing?: {[path: string]: unknown}
  unset?: string[]
  inc?: {[path: string]: number}
  dec?: {[path: string]: number}
  insert?: {
    before?: string
    after?: string
    replace?: string
    items: unknown[]
  }
  diffMatchPatch?: {[path: string]: string}
}

type KeyedSegment = {_key: string}

function isKeySegment(segment: unknown): segment is KeyedSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    '_key' in segment &&
    typeof (segment as KeyedSegment)._key === 'string'
  )
}

function isKeyedObject(item: unknown): item is KeyedSegment {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as {_key?: unknown})._key === 'string'
  )
}

function generateArrayKey(length = 12): string {
  const numBytes = Math.ceil(length / 2)
  const bytes = crypto.getRandomValues(new Uint8Array(numBytes))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

function ensureArrayKeysDeep<R>(input: R): R {
  if (!input || typeof input !== 'object') {
    return input
  }

  if (Array.isArray(input)) {
    if (!input.length) {
      return input
    }
    const first = input[0]
    if (typeof first !== 'object') {
      return input
    }
    if (input.every(isKeyedObject)) {
      return input
    }
    return input.map((item: unknown) => {
      if (!item || typeof item !== 'object') {
        return item
      }
      if (isKeyedObject(item)) {
        return ensureArrayKeysDeep(item)
      }
      const next = ensureArrayKeysDeep(item)
      return {...next, _key: generateArrayKey()}
    }) as R
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      ensureArrayKeysDeep(value),
    ]),
  ) as R
}

function setDeep(
  input: unknown,
  path: SingleValuePath,
  value: unknown,
): unknown {
  const [currentSegment, ...restOfPath] = path
  if (currentSegment === undefined) {
    return value
  }

  if (typeof input !== 'object' || input === null) {
    if (typeof currentSegment === 'string') {
      return {[currentSegment]: setDeep(null, restOfPath, value)}
    }

    let index: number | undefined
    if (isKeySegment(currentSegment)) {
      index = 0
    } else if (typeof currentSegment === 'number' && currentSegment >= 0) {
      index = currentSegment
    } else {
      return input
    }

    return [
      ...Array.from({length: index}).fill(null),
      setDeep(null, restOfPath, value),
    ]
  }

  if (Array.isArray(input)) {
    let index: number | undefined
    if (isKeySegment(currentSegment)) {
      index = getIndexForKey(input, currentSegment._key) ?? input.length
    } else if (typeof currentSegment === 'number') {
      index =
        currentSegment < 0 ? input.length + currentSegment : currentSegment
    }
    if (index === undefined) {
      return input
    }

    if (index in input) {
      return input.map((nestedInput, i) =>
        i === index ? setDeep(nestedInput, restOfPath, value) : nestedInput,
      )
    }

    return [
      ...input,
      ...Array.from({length: index - input.length}).fill(null),
      setDeep(null, restOfPath, value),
    ]
  }

  if (typeof currentSegment === 'object') {
    return input
  }

  if (currentSegment in input) {
    return Object.fromEntries(
      Object.entries(input).map(([key, nestedInput]) =>
        key === currentSegment
          ? [key, setDeep(nestedInput, restOfPath, value)]
          : [key, nestedInput],
      ),
    )
  }

  return {...input, [currentSegment]: setDeep(null, restOfPath, value)}
}

function unsetDeep(input: unknown, path: SingleValuePath): unknown {
  const [currentSegment, ...restOfPath] = path
  if (currentSegment === undefined) {
    return input
  }
  if (typeof input !== 'object' || input === null) {
    return input
  }

  let resolved: string | number | undefined
  if (isKeySegment(currentSegment)) {
    resolved = getIndexForKey(input, currentSegment._key)
  } else if (
    typeof currentSegment === 'string' ||
    typeof currentSegment === 'number'
  ) {
    resolved = currentSegment
  }
  if (resolved === undefined) {
    return input
  }

  let segment: string | number = resolved
  if (typeof segment === 'number' && Array.isArray(input)) {
    segment = segment < 0 ? input.length + segment : segment
  }
  if (!(segment in input)) {
    return input
  }

  if (!restOfPath.length) {
    if (Array.isArray(input)) {
      return input.filter((_nestedInput, index) => index !== segment)
    }
    return Object.fromEntries(
      Object.entries(input).filter(([key]) => key !== segment.toString()),
    )
  }

  if (Array.isArray(input)) {
    return input.map((nestedInput, index) =>
      index === segment ? unsetDeep(nestedInput, restOfPath) : nestedInput,
    )
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) =>
      key === segment ? [key, unsetDeep(value, restOfPath)] : [key, value],
    ),
  )
}

/**
 * Whether every array-addressing segment (keyed or numeric) in the path
 * resolves to an existing array item. Content Lake auto-creates missing
 * object properties when setting, but never creates array items: a `set`
 * through an unresolvable keyed or indexed segment is a silent no-op
 * server-side (gradient's jsonpath matcher only auto-creates map
 * properties).
 */
function resolvesArraySegments(input: unknown, path: SingleValuePath): boolean {
  let current: unknown = input
  for (const segment of path) {
    if (typeof segment === 'string') {
      current =
        typeof current === 'object' &&
        current !== null &&
        !Array.isArray(current)
          ? (current as {[key: string]: unknown})[segment]
          : undefined
      continue
    }
    if (!Array.isArray(current)) {
      return false
    }
    if (isKeySegment(segment)) {
      const index = getIndexForKey(current, segment._key)
      if (index === undefined) {
        return false
      }
      current = current[index]
    } else {
      const index = segment < 0 ? current.length + segment : segment
      if (!(index in current)) {
        return false
      }
      current = current[index]
    }
  }
  return true
}

function set(input: unknown, pathExpressionValues: {[path: string]: unknown}) {
  const result = Object.entries(pathExpressionValues)
    .flatMap(([pathExpression, replacementValue]) =>
      Array.from(jsonMatch(input, pathExpression)).map((matchEntry) => ({
        ...matchEntry,
        replacementValue,
      })),
    )
    .filter(({path}) => resolvesArraySegments(input, path))
    .reduce(
      (acc, {path, replacementValue}) => setDeep(acc, path, replacementValue),
      input,
    )

  return ensureArrayKeysDeep(result)
}

function setIfMissing(
  input: unknown,
  pathExpressionValues: {[path: string]: unknown},
) {
  const result = Object.entries(pathExpressionValues)
    .flatMap(([pathExpression, replacementValue]) =>
      Array.from(jsonMatch(input, pathExpression)).map((matchEntry) => ({
        ...matchEntry,
        replacementValue,
      })),
    )
    .filter(
      (matchEntry) =>
        matchEntry.value === null || matchEntry.value === undefined,
    )
    .filter(({path}) => resolvesArraySegments(input, path))
    .reduce(
      (acc, {path, replacementValue}) => setDeep(acc, path, replacementValue),
      input,
    )

  return ensureArrayKeysDeep(result)
}

function unset(input: unknown, pathExpressions: string[]) {
  const result = pathExpressions
    .flatMap((pathExpression) => Array.from(jsonMatch(input, pathExpression)))
    // remove in reverse match order so array indexes stay valid while
    // unsetting
    .reverse()
    .reduce((acc, {path}) => unsetDeep(acc, path), input)

  return ensureArrayKeysDeep(result)
}

function inc(input: unknown, pathExpressionValues: {[path: string]: number}) {
  const result = Object.entries(pathExpressionValues)
    .flatMap(([pathExpression, valueToAdd]) =>
      Array.from(jsonMatch(input, pathExpression)).map((matchEntry) => ({
        ...matchEntry,
        valueToAdd,
      })),
    )
    .filter(
      <T extends {value: unknown}>(
        matchEntry: T,
      ): matchEntry is T & {value: number} =>
        typeof matchEntry.value === 'number',
    )
    .reduce(
      (acc, {path, value, valueToAdd}) =>
        setDeep(acc, path, value + valueToAdd),
      input,
    )

  return ensureArrayKeysDeep(result)
}

function dec(input: unknown, pathExpressionValues: {[path: string]: number}) {
  return inc(
    input,
    Object.fromEntries(
      Object.entries(pathExpressionValues)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => [key, -value]),
    ),
  )
}

function insert(
  input: unknown,
  insertPatch: NonNullable<SanityPatchOperationRecord['insert']>,
) {
  const {items, ...positions} = insertPatch

  let operation: 'before' | 'after' | 'replace' | undefined
  let pathExpression: string | undefined

  if (typeof positions.before === 'string') {
    operation = 'before'
    pathExpression = positions.before
  } else if (typeof positions.after === 'string') {
    operation = 'after'
    pathExpression = positions.after
  } else if (typeof positions.replace === 'string') {
    operation = 'replace'
    pathExpression = positions.replace
  }
  if (!operation || !pathExpression || !pathExpression.length) {
    return input
  }

  const arrayPath = slicePath(pathExpression, 0, -1)
  const positionPath = slicePath(pathExpression, -1)

  let result = input

  for (const {path, value} of jsonMatch(input, arrayPath)) {
    if (!Array.isArray(value)) {
      continue
    }
    let arr = value

    switch (operation) {
      case 'replace': {
        const indexesToRemove = new Set<number>()
        let position = Infinity

        for (const itemMatch of jsonMatch(arr, positionPath)) {
          if (itemMatch.path.length !== 1) {
            continue
          }
          const [segment] = itemMatch.path
          if (typeof segment === 'string') {
            continue
          }

          let index: number | undefined
          if (typeof segment === 'number') {
            index = segment
          }
          if (typeof index === 'number' && index < 0) {
            index = arr.length + index
          }
          if (isKeySegment(segment)) {
            index = getIndexForKey(arr, segment._key)
          }
          if (typeof index !== 'number') {
            continue
          }
          if (index < 0) {
            index = arr.length + index
          }

          indexesToRemove.add(index)
          if (index < position) {
            position = index
          }
        }

        if (position === Infinity) {
          continue
        }

        arr = arr
          .map((item, index) => ({item, index}))
          .filter(({index}) => !indexesToRemove.has(index))
          .map(({item}) => item)

        arr = [
          ...arr.slice(0, position),
          ...items,
          ...arr.slice(position, arr.length),
        ]

        break
      }
      case 'before': {
        let position = Infinity

        for (const itemMatch of jsonMatch(arr, positionPath)) {
          if (itemMatch.path.length !== 1) {
            continue
          }
          const [segment] = itemMatch.path
          if (typeof segment === 'string') {
            continue
          }

          let index: number | undefined
          if (typeof segment === 'number') {
            index = segment
          }
          if (typeof index === 'number' && index < 0) {
            index = arr.length + index
          }
          if (isKeySegment(segment)) {
            index = getIndexForKey(arr, segment._key)
          }
          if (typeof index !== 'number') {
            continue
          }
          if (index < 0) {
            index = arr.length - index
          }
          if (index < position) {
            position = index
          }
        }

        if (position === Infinity) {
          continue
        }

        arr = [
          ...arr.slice(0, position),
          ...items,
          ...arr.slice(position, arr.length),
        ]

        break
      }
      case 'after': {
        let position = -Infinity

        for (const itemMatch of jsonMatch(arr, positionPath)) {
          if (itemMatch.path.length !== 1) {
            continue
          }
          const [segment] = itemMatch.path
          if (typeof segment === 'string') {
            continue
          }

          let index: number | undefined
          if (typeof segment === 'number') {
            index = segment
          }
          if (typeof index === 'number' && index < 0) {
            index = arr.length + index
          }
          if (isKeySegment(segment)) {
            index = getIndexForKey(arr, segment._key)
          }
          if (typeof index !== 'number') {
            continue
          }
          if (index > position) {
            position = index
          }
        }

        if (position === -Infinity) {
          continue
        }

        arr = [
          ...arr.slice(0, position + 1),
          ...items,
          ...arr.slice(position + 1, arr.length),
        ]

        break
      }
      default: {
        continue
      }
    }

    result = setDeep(result, path, arr)
  }

  return ensureArrayKeysDeep(result)
}

function diffMatchPatch(
  input: unknown,
  pathExpressionValues: {[path: string]: string},
) {
  const result = Object.entries(pathExpressionValues)
    .flatMap(([pathExpression, dmp]) =>
      Array.from(jsonMatch(input, pathExpression)).map((m) => ({...m, dmp})),
    )
    .filter((i) => i.value !== undefined)
    .map(({path, value, dmp}) => {
      if (typeof value !== 'string') {
        throw new Error(
          `Can't diff-match-patch \`${JSON.stringify(value)}\` at path \`${stringifyPath(path)}\`, because it is not a string`,
        )
      }

      const [nextValue] = applyPatches(parsePatch(dmp), value)
      return {path, value: nextValue}
    })
    .reduce((acc, {path, value}) => setDeep(acc, path, value), input as unknown)

  return ensureArrayKeysDeep(result)
}

/**
 * Applies one Sanity patch to the given document, using Content Lake's fixed
 * operation order within a patch (set, setIfMissing, unset, inc, dec, insert,
 * diffMatchPatch). Unresolvable paths are no-ops; a diff-match-patch against
 * a non-string throws, which callers should treat as the whole transaction
 * being rejected.
 */
export function applyPatchOperations(
  input: unknown,
  operations: SanityPatchOperationRecord,
): unknown {
  let result = input
  if (operations.set) {
    result = set(result, operations.set)
  }
  if (operations.setIfMissing) {
    result = setIfMissing(result, operations.setIfMissing)
  }
  if (operations.unset) {
    result = unset(result, operations.unset)
  }
  if (operations.inc) {
    result = inc(result, operations.inc)
  }
  if (operations.dec) {
    result = dec(result, operations.dec)
  }
  if (operations.insert) {
    result = insert(result, operations.insert)
  }
  if (operations.diffMatchPatch) {
    result = diffMatchPatch(result, operations.diffMatchPatch)
  }
  return result
}
