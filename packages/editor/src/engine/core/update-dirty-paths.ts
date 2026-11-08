import {hasUsableKey} from '../../paths/node-segment'
import {serializePath} from '../../paths/serialize-path'
import {resolveNode} from '../../traversal/get-node'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

const repairChildArrayPaths = new WeakMap<Editor, Map<string, Path>>()

export const __dirtyPathRepairStats = {scans: 0}

export function transformChildArrayRepairMarks(
  editor: Editor,
  operation: EngineOperation,
): void {
  if (
    operation.type !== 'set' ||
    operation.path.at(-1) !== '_key' ||
    typeof operation.value !== 'string' ||
    operation.value.length === 0
  ) {
    return
  }
  const paths = repairChildArrayPaths.get(editor)
  if (!paths) {
    return
  }
  const nodePath = operation.path.slice(0, -1)
  for (const [key, path] of [...paths]) {
    __dirtyPathRepairStats.scans++
    if (
      path.length < nodePath.length ||
      serializePath(path.slice(0, nodePath.length)) !== serializePath(nodePath)
    ) {
      continue
    }
    paths.delete(key)
    const transformed = [...path]
    transformed[nodePath.length - 1] = {_key: operation.value}
    paths.set(serializePath(transformed), transformed)
  }
}

export function markChildArraysForRepair(editor: Editor, path: Path): void {
  const paths = repairChildArrayPaths.get(editor) ?? new Map<string, Path>()
  paths.set(serializePath(path), path)
  repairChildArrayPaths.set(editor, paths)
}

export function takeChildArrayRepairMark(editor: Editor, path: Path): boolean {
  const paths = repairChildArrayPaths.get(editor)
  if (!paths) {
    return false
  }
  const key = serializePath(path)
  const marked = paths.delete(key)
  if (paths.size === 0) {
    repairChildArrayPaths.delete(editor)
  }
  return marked
}

export function updateDirtyPaths(editor: Editor, newDirtyPaths: Path[]): void {
  for (const path of newDirtyPaths) {
    const stablePath = path.some(
      (segment) =>
        typeof segment === 'number' ||
        (isKeyedSegment(segment) && !hasUsableKey(segment._key)),
    )
      ? stableDirtyPath(editor, path)
      : path
    if (!stablePath) {
      continue
    }
    const key = serializePath(stablePath)
    if (editor.dirtyPathKeys.has(key)) {
      continue
    }
    editor.dirtyPathKeys.add(key)
    editor.dirtyPaths.push(stablePath)
  }
}

function stableDirtyPath(editor: Editor, path: Path): Path | undefined {
  const result = resolveNode(editor.snapshot, path)
  if (
    result.status !== 'found' ||
    result.entry.path.some(
      (segment) =>
        typeof segment === 'number' ||
        (isKeyedSegment(segment) && !hasUsableKey(segment._key)),
    )
  ) {
    return undefined
  }
  return result.entry.path
}
