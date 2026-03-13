import type {Location, Node, NodeEntry} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {getNode} from '../node/get-node'
import type {LeafEdge} from '../types/types'
import {path} from './path'

export function node(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): NodeEntry<Node> {
  const nodePath = path(editor, at, options)
  const nodeValue = getNode(editor, nodePath, editor.schema)
  return [nodeValue, nodePath]
}
