import {hasUsableKey} from '../../paths/node-segment'
import {serializePath} from '../../paths/serialize-path'
import {resolveNode} from '../../traversal/get-node'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

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
  const result = resolveNode(editor.snapshot, operation.path.slice(0, -1))
  if (result.status !== 'found') {
    return
  }
  const oldNodePath = result.entry.path
  const affected = editor.childArrayRepairPathPrefixes.get(
    serializePath(oldNodePath),
  )
  if (!affected) {
    return
  }
  const newNodePath = [...oldNodePath.slice(0, -1), {_key: operation.value}]
  for (const markKey of [...affected]) {
    const path = editor.childArrayRepairPaths.get(markKey)
    if (!path) {
      continue
    }
    deleteRepairPath(editor, markKey, path)
    addRepairPath(editor, [...newNodePath, ...path.slice(oldNodePath.length)])
  }
}

export function markChildArraysForRepair(editor: Editor, path: Path): void {
  addRepairPath(editor, path)
}

export function takeChildArrayRepairMark(editor: Editor, path: Path): boolean {
  const key = serializePath(path)
  const markedPath = editor.childArrayRepairPaths.get(key)
  if (!markedPath) {
    return false
  }
  deleteRepairPath(editor, key, markedPath)
  return true
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

function addRepairPath(editor: Editor, path: Path): void {
  const key = serializePath(path)
  if (editor.childArrayRepairPaths.has(key)) {
    return
  }
  editor.childArrayRepairPaths.set(key, path)
  for (const prefix of nodePathPrefixes(path)) {
    const prefixKey = serializePath(prefix)
    const marks =
      editor.childArrayRepairPathPrefixes.get(prefixKey) ?? new Set()
    marks.add(key)
    editor.childArrayRepairPathPrefixes.set(prefixKey, marks)
  }
}

function deleteRepairPath(editor: Editor, key: string, path: Path): void {
  editor.childArrayRepairPaths.delete(key)
  for (const prefix of nodePathPrefixes(path)) {
    const prefixKey = serializePath(prefix)
    const marks = editor.childArrayRepairPathPrefixes.get(prefixKey)
    marks?.delete(key)
    if (marks?.size === 0) {
      editor.childArrayRepairPathPrefixes.delete(prefixKey)
    }
  }
}

function nodePathPrefixes(path: Path): Path[] {
  const prefixes: Path[] = [[]]
  for (let index = 0; index < path.length; index++) {
    if (typeof path[index] !== 'string') {
      prefixes.push(path.slice(0, index + 1))
    }
  }
  return prefixes
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
