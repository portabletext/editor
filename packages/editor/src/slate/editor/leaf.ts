import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {NodeEntry} from '../interfaces/node'
import {getLeaf} from '../node/get-leaf'
import type {LeafEdge} from '../types/types'
import {path} from './path'

export function leaf(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): NodeEntry<PortableTextSpan | PortableTextObject> {
  const leafPath = path(editor, at, options)
  const node = getLeaf(editor, leafPath, editor.schema)
  return [node, leafPath]
}
