import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location, Span} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import {isPath} from '../path/is-path'
import type {SelectionMode} from '../types/types'
import {after} from './after'
import {node} from './node'
import {nodes} from './nodes'
import {path} from './path'

export function next<T extends Node>(
  editor: Editor,
  options: {
    at?: Location
    match: NodeMatch<T>
    mode?: SelectionMode
    includeObjectNodes?: boolean
  },
): NodeEntry<T> | undefined {
  const {mode = 'lowest', includeObjectNodes = false} = options
  const {match, at = editor.selection} = options

  if (!at) {
    return
  }

  const pointAfterLocation = after(editor, at, {includeObjectNodes})

  if (!pointAfterLocation) {
    return
  }

  const [, to] = node(editor, path(editor, [], {edge: 'end'}))

  const span: Span = [pointAfterLocation.path, to]

  if (isPath(at) && at.length === 0) {
    throw new Error(`Cannot get the next node from the root node!`)
  }

  const [nextEntry] = nodes(editor, {at: span, match, mode, includeObjectNodes})

  return nextEntry
}
