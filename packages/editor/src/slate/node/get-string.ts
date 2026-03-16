import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../../editor/editor-schema'
import {isEditor} from '../editor/is-editor'
import type {Editor} from '../interfaces/editor'
import type {Node} from '../interfaces/node'
import {isObjectNode} from './is-object-node'

export function getString(node: Editor | Node, schema: EditorSchema): string {
  if (isEditor(node)) {
    return ''
  }

  if (isObjectNode({schema}, node)) {
    return ''
  }

  if (isSpan({schema}, node)) {
    return node.text
  }

  return node.children.map((child) => getString(child, schema)).join('')
}
