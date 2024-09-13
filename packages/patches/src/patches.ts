import {makePatches, stringifyPatches} from '@sanity/diff-match-patch'
import type {
  DiffMatchPatch,
  InsertPatch,
  InsertPosition,
  Path,
  PathSegment,
  SetIfMissingPatch,
  SetPatch,
  UnsetPatch,
} from './types'

/** @public */
export function setIfMissing(value: any, path: Path = []): SetIfMissingPatch {
  return {
    type: 'setIfMissing',
    path,
    value,
  }
}

/** @public */
export function diffMatchPatch(
  currentValue: string,
  nextValue: string,
  path: Path = [],
): DiffMatchPatch {
  const patches = makePatches(currentValue, nextValue)
  const patch = stringifyPatches(patches)
  return {type: 'diffMatchPatch', path, value: patch}
}

/** @public */
export function insert(
  items: any[],
  position: InsertPosition,
  path: Path = [],
): InsertPatch {
  return {
    type: 'insert',
    path,
    position,
    items,
  }
}

/** @public */
export function set(value: any, path: Path = []): SetPatch {
  return {type: 'set', path, value}
}

/** @public */
export function unset(path: Path = []): UnsetPatch {
  return {type: 'unset', path}
}

/** @internal */
export function prefixPath<T extends {path: Path}>(
  patch: T,
  segment: PathSegment,
): T {
  return {
    ...patch,
    path: [segment, ...patch.path],
  }
}
