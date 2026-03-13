import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor, Node} from '../interfaces/node'
import {isText} from '../text/is-text'
import {isObjectNode} from './is-object-node'

export function getString(node: Node, schema: EditorSchema): string {
  if (isObjectNode(node, schema)) {
    return ''
  }

  if (isText(node, schema)) {
    return node.text
  }

  return (node as Ancestor).children
    .map((child) => getString(child, schema))
    .join('')
}
