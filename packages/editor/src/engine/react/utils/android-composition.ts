import {isSpan} from '@portabletext/schema'
import {serializePath} from '../../../paths/serialize-path'
import {getNode} from '../../../traversal/get-node'
import {getNodes} from '../../../traversal/get-nodes'
import {pathContains} from '../../../traversal/path-contains'
import type {TraversalSnapshot} from '../../../traversal/traversal-snapshot'
import type {Editor} from '../../interfaces/editor'
import type {EngineOperation} from '../../interfaces/operation'
import type {Path} from '../../interfaces/path'
import {pathEquals} from '../../path/path-equals'
import {splitNodePath} from '../../path/split-node-path'
import {rangeEdges} from '../../range/range-edges'

export const androidComposition = new WeakMap<
  Editor,
  {elements: Array<HTMLElement>; paths: Array<Path>; applying: boolean}
>()

const androidLeafRedraws = new WeakMap<Editor, Map<string, Set<() => void>>>()

export function redrawAndroidComposition(editor: Editor) {
  const composition = androidComposition.get(editor)
  androidComposition.delete(editor)
  editor.composing = false
  if (!composition) {
    return
  }
  for (const path of composition.paths) {
    for (const redraw of androidLeafRedraws
      .get(editor)
      ?.get(serializePath(path)) ?? []) {
      redraw()
    }
  }
  editor.forceRender?.()
}

export function trackAndroidCompositionSelection(editor: Editor) {
  const composition = androidComposition.get(editor)
  const selection = editor.snapshot.context.selection
  if (!composition || !selection) {
    return
  }
  const [start, end] = rangeEdges(selection, editor.snapshot.context)
  for (const {path} of getNodes(editor.snapshot, {
    from: start.path,
    to: end.path,
    match: (node) => isSpan({schema: editor.snapshot.context.schema}, node),
  })) {
    if (!composition.paths.some((tracked) => pathEquals(tracked, path))) {
      composition.paths.push(path)
    }
  }
}

export function subscribeToAndroidLeafRedraw(
  editor: Editor,
  path: Path,
  redraw: () => void,
) {
  const leaves =
    androidLeafRedraws.get(editor) ?? new Map<string, Set<() => void>>()
  androidLeafRedraws.set(editor, leaves)
  const key = serializePath(path)
  const callbacks = leaves.get(key) ?? new Set<() => void>()
  leaves.set(key, callbacks)
  callbacks.add(redraw)
  return () => {
    callbacks.delete(redraw)
    if (callbacks.size === 0) {
      leaves.delete(key)
    }
  }
}

export function operationEndsAndroidComposition(
  operation: EngineOperation,
  trackedPaths: Array<Path>,
  snapshot: TraversalSnapshot,
): boolean {
  const operationPath =
    operation.type === 'set.selection'
      ? undefined
      : resolveCompositionPath(snapshot, operation.path)
  if (!operationPath) {
    return false
  }
  return trackedPaths.some((trackedPath) => {
    const spanPath = getNode(snapshot, trackedPath)?.path
    if (!spanPath) {
      return false
    }
    switch (operation.type) {
      case 'insert.text':
      case 'remove.text':
        return pathEquals(operationPath, spanPath)
      case 'set':
      case 'unset':
        return (
          pathEquals(operationPath, [...spanPath, 'text']) ||
          pathContains(operationPath, spanPath)
        )
      case 'insert':
      case 'set.selection':
      default:
        return false
    }
  })
}

function resolveCompositionPath(
  snapshot: TraversalSnapshot,
  path: Path,
): Path | undefined {
  if (path.length === 0) {
    return path
  }
  const {nodePath, propertyPath} = splitNodePath(path)
  const entry = getNode(snapshot, nodePath)
  return entry ? [...entry.path, ...propertyPath] : undefined
}
