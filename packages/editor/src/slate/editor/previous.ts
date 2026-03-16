import type {Editor, NodeMatch} from '../interfaces/editor'
import type {Location, Span} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import {isPath} from '../path/is-path'
import type {SelectionMode} from '../types/types'
import {before} from './before'
import {node} from './node'
import {nodes} from './nodes'
import {path} from './path'

export function previous<T extends Node>(
  editor: Editor,
  options: {
    at?: Location
    match: NodeMatch<T>
    mode?: SelectionMode
    voids?: boolean
  },
): NodeEntry<T> | undefined {
  const {mode = 'lowest', voids = false} = options
  const {match, at = editor.selection} = options

  if (!at) {
    return
  }

  const pointBeforeLocation = before(editor, at, {voids})

  if (!pointBeforeLocation) {
    return
  }

  const [, to] = node(editor, path(editor, [], {edge: 'start'}))

  // The search location is from the start of the document to the path of
  // the point before the location passed in
  const span: Span = [pointBeforeLocation.path, to]

  if (isPath(at) && at.length === 0) {
    throw new Error(`Cannot get the previous node from the root node!`)
  }

  const [previousEntry] = nodes(editor, {
    reverse: true,
    at: span,
    match,
    mode,
    voids,
  })

  return previousEntry
}
