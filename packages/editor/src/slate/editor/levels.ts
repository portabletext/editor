import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import {getLevels} from '../node/get-levels'
import {path} from './path'

export function* levels<T extends Node>(
  editor: Editor,
  options: {
    at?: Location
    match?: NodeMatch<T>
    reverse?: boolean
    includeObjectNodes?: boolean
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

  for (const [n, p] of getLevels(editor, fromPath, editor.schema)) {
    if (!match(n, p)) {
      continue
    }

    levels.push([n as T, p] satisfies NodeEntry<T>)
  }

  if (reverse) {
    levels.reverse()
  }

  yield* levels
}
