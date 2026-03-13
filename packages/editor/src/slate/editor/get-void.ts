import type {Location, NodeEntry, ObjectNode} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {getNode} from '../node/get-node'
import type {MaximizeMode} from '../types/types'
import {above} from './above'
import {path} from './path'

export function getVoid(
  editor: Editor,
  options: {at?: Location; mode?: MaximizeMode; voids?: boolean} = {},
): NodeEntry<ObjectNode> | undefined {
  const {at = editor.selection} = options
  if (!at) {
    return
  }

  const nodePath = path(editor, at)
  const node = getNode(editor, nodePath, editor.schema)

  if (editor.isObjectNode(node)) {
    return [node, nodePath] as any
  }

  return above(editor, {
    ...options,
    match: (n) => editor.isObjectNode(n),
  }) as NodeEntry<ObjectNode> | undefined
}
