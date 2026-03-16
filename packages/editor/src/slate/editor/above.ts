import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {isRange} from '../range/is-range'
import type {MaximizeMode} from '../types/types'
import {levels} from './levels'
import {path} from './path'

export function above<T extends Node>(
  editor: Editor,
  options: {
    at?: Location
    match?: NodeMatch<T>
    mode?: MaximizeMode
    voids?: boolean
  } = {},
): NodeEntry<T> | undefined {
  const {voids = false, mode = 'lowest', at = editor.selection, match} = options

  if (!at) {
    return
  }

  let fromPath = path(editor, at)

  // If `at` is a Range that spans mulitple nodes, `path` will be their common ancestor.
  // Otherwise `path` will be a text node and/or the same as `at`, in which cases we want to start with its parent.
  if (!isRange(at) || pathEquals(at.focus.path, at.anchor.path)) {
    if (fromPath.length === 0) {
      return
    }
    fromPath = parentPath(fromPath)
  }

  const reverse = mode === 'lowest'

  const [firstMatch] = levels(editor, {
    at: fromPath,
    voids,
    match,
    reverse,
  })
  return firstMatch
}
