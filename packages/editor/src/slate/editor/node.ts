import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
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
