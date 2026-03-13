import type {Ancestor, Location, NodeEntry} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {parentPath} from '../path/parent-path'
import type {LeafEdge} from '../types/types'
import {node} from './node'
import {path} from './path'

export function parent(
  editor: Editor,
  at: Location,
  options: {depth?: number; edge?: LeafEdge} = {},
): NodeEntry<Ancestor> {
  const nodePath = path(editor, at, options)
  const parentPath_ = parentPath(nodePath)
  const entry = node(editor, parentPath_)
  return entry as NodeEntry<Ancestor>
}
