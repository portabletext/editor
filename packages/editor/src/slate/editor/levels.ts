import type {Location} from '../interfaces'
import type {Editor, NodeMatch} from '../interfaces/editor'
import {Node, type NodeEntry} from '../interfaces/node'
import {path} from './path'

export function* levels<T extends Node>(
  editor: Editor,
  options: {
    at?: Location
    match?: NodeMatch<T>
    reverse?: boolean
    voids?: boolean
  } = {},
): Generator<NodeEntry<T>, void, undefined> {
  const {at = editor.selection, reverse = false} = options
  let {match} = options

  if (match == null) {
    match = () => true
  }

  if (!at) {
    return
  }

  const levels: NodeEntry<T>[] = []
  const fromPath = path(editor, at)

  for (const [n, p] of Node.levels(editor, fromPath, editor.schema)) {
    if (!match(n, p)) {
      continue
    }

    levels.push([n, p] as NodeEntry<T>)
  }

  if (reverse) {
    levels.reverse()
  }

  yield* levels
}
