import {serializePath} from '../../paths/serialize-path'
import type {
  DirtyPath,
  DirtyPathEntry,
  DirtyPathOrigin,
} from '../interfaces/dirty-path-entry'
import type {Editor} from '../interfaces/editor'

export function updateDirtyPaths(
  editor: Editor,
  newDirtyPaths: Array<DirtyPath>,
  origin: DirtyPathOrigin,
) {
  const dirtyPaths = editor.dirtyPaths
  const dirtyPathKeys = editor.dirtyPathKeys

  for (const dirtyPath of newDirtyPaths) {
    const key = getDirtyPathKey(dirtyPath)
    const existing = dirtyPathKeys.get(key)

    if (!existing) {
      const entry: DirtyPathEntry = {...dirtyPath, origin}
      dirtyPathKeys.set(key, entry)
      dirtyPaths.push(entry)
      continue
    }

    if (existing.kind === 'adjacency' || dirtyPath.kind === 'adjacency') {
      if (originRank[origin] > originRank[existing.origin]) {
        existing.origin = origin
      }
      continue
    }

    if (outranks({kind: dirtyPath.kind, origin}, existing)) {
      existing.kind = dirtyPath.kind
      existing.origin = origin
    }
  }

  editor.dirtyPaths = dirtyPaths
  editor.dirtyPathKeys = dirtyPathKeys
}

export function getDirtyPathKey(dirtyPath: DirtyPath): string {
  if (dirtyPath.kind === 'adjacency') {
    return `adjacency(${serializePath(dirtyPath.path)})(${serializePath(dirtyPath.adjacency.previous)})(${serializePath(dirtyPath.adjacency.next)})`
  }

  return serializePath(dirtyPath.path)
}

type NodeDirtyPathKind = Exclude<DirtyPath['kind'], 'adjacency'>

function outranks(
  contribution: {kind: NodeDirtyPathKind; origin: DirtyPathOrigin},
  existing: {kind: NodeDirtyPathKind; origin: DirtyPathOrigin},
): boolean {
  if (originRank[contribution.origin] !== originRank[existing.origin]) {
    return originRank[contribution.origin] > originRank[existing.origin]
  }

  return kindRank[contribution.kind] > kindRank[existing.kind]
}

const originRank: Record<DirtyPathOrigin, number> = {
  normalization: 0,
  remote: 1,
  local: 2,
  force: 3,
}

const kindRank: Record<NodeDirtyPathKind, number> = {
  ancestor: 0,
  neighbour: 1,
  descendant: 2,
  node: 3,
}
