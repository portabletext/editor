import type {Descendant, Location, NodeEntry, Span} from '../interfaces'
import type {Editor, NodeMatch} from '../interfaces/editor'
import {Path} from '../interfaces/path'
import type {SelectionMode} from '../types/types'
import {before} from './before'
import {node} from './node'
import {nodes} from './nodes'
import {parent} from './parent'
import {path} from './path'

export function previous<T extends Descendant>(
  editor: Editor,
  options: {
    at?: Location
    match?: NodeMatch<T>
    mode?: SelectionMode
    voids?: boolean
  } = {},
): NodeEntry<T> | undefined {
  const {mode = 'lowest', voids = false} = options
  let {match, at = editor.selection} = options

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

  if (Path.isPath(at) && at.length === 0) {
    throw new Error(`Cannot get the previous node from the root node!`)
  }

  if (match == null) {
    if (Path.isPath(at)) {
      const [parentNode] = parent(editor, at)
      match = (n) => parentNode.children.includes(n)
    } else {
      match = () => true
    }
  }

  const [previousEntry] = nodes(editor, {
    reverse: true,
    at: span,
    match,
    mode,
    voids,
  })

  return previousEntry as NodeEntry<T> | undefined
}
