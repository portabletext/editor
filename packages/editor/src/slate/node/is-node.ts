import type {EditorSchema} from '../../editor/editor-schema'
import {isEditor} from '../editor/is-editor'
import {Element} from '../interfaces/element'
import type {Node} from '../interfaces/node'
import {Text} from '../interfaces/text'
import {isObjectNode} from './is-object-node'

export function isNode(value: any, schema: EditorSchema): value is Node {
  return (
    Text.isText(value, schema) ||
    Element.isElement(value, schema) ||
    isEditor(value) ||
    isObjectNode(value, schema)
  )
}
