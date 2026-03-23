import type {PortableTextObject} from '@portabletext/schema'
import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {NodeEntry} from '../interfaces/node'
import {getNode} from '../node/get-node'
import {isObjectNode} from '../node/is-object-node'
import type {MaximizeMode} from '../types/types'
import {above} from './above'
import {path} from './path'

export function getObjectNode(
  editor: Editor,
  options: {at?: Location; mode?: MaximizeMode} = {},
): NodeEntry<PortableTextObject> | undefined {
  const {at = editor.selection} = options
  if (!at) {
    return
  }

  const nodePath = path(editor, at)
  const node = getNode(editor, nodePath, editor.schema)

  if (isObjectNode({schema: editor.schema}, node)) {
    return [node, nodePath]
  }

  return above(editor, {
    ...options,
    match: (n) => isObjectNode({schema: editor.schema}, n),
  })
}
