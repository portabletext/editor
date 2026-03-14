import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {NodeEntry, ObjectNode} from '../interfaces/node'
import type {Text} from '../interfaces/text'
import {getLeaf} from '../node/get-leaf'
import type {LeafEdge} from '../types/types'
import {path} from './path'

export function leaf(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): NodeEntry<Text | ObjectNode> {
  const leafPath = path(editor, at, options)
  const node = getLeaf(editor, leafPath, editor.schema)
  return [node, leafPath]
}
