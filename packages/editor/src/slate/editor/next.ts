import type {Descendant, Location, NodeEntry, Span} from '../interfaces'
import type {Editor, NodeMatch} from '../interfaces/editor'
import {Path} from '../interfaces/path'
import type {SelectionMode} from '../types/types'
import {after} from './after'
import {node} from './node'
import {nodes} from './nodes'
import {parent} from './parent'
import {path} from './path'

export function next<T extends Descendant>(
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

  const pointAfterLocation = after(editor, at, {voids})

  if (!pointAfterLocation) {
    return
  }

  const [, to] = node(editor, path(editor, [], {edge: 'end'}))

  const span: Span = [pointAfterLocation.path, to]

  if (Path.isPath(at) && at.length === 0) {
    throw new Error(`Cannot get the next node from the root node!`)
  }

  if (match == null) {
    if (Path.isPath(at)) {
      const [parentNode] = parent(editor, at)
      match = (n) => parentNode.children.includes(n)
    } else {
      match = () => true
    }
  }

  const [nextEntry] = nodes(editor, {at: span, match, mode, voids})
  return nextEntry as NodeEntry<T> | undefined
}
