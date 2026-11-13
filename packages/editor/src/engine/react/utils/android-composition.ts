import {isSpan} from '@portabletext/schema'
import {serializePath} from '../../../paths/serialize-path'
import {getNodes} from '../../../traversal/get-nodes'
import type {Editor} from '../../interfaces/editor'
import type {Path} from '../../interfaces/path'
import {pathEquals} from '../../path/path-equals'
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
