import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Node, NodeEntry} from '../interfaces/node'
import type {Path} from '../interfaces/path'
import {parentPath} from '../path/parent-path'
import type {LeafEdge} from '../types/types'
import {node} from './node'
import {path} from './path'

export function parent(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): NodeEntry<Node> | [Editor, Path] {
  const nodePath = path(editor, at, options)
  const parentPath_ = parentPath(nodePath)

  if (parentPath_.length === 0) {
    return [editor, parentPath_]
  }

  return node(editor, parentPath_)
}
