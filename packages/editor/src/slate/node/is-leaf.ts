import {
  isSpan,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {isObjectNode} from './is-object-node'

export function isLeaf(
  node: Editor | Node,
  schema: EditorSchema,
): node is PortableTextSpan | PortableTextObject {
  return isSpan({schema}, node) || isObjectNode({schema}, node)
}
