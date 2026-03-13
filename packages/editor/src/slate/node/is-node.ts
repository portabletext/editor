import type {EditorSchema} from '../../editor/editor-schema'
import {isEditor} from '../editor/is-editor'
import {isElement} from '../element/is-element'
import type {Node} from '../interfaces/node'
import {isText} from '../text/is-text'
import {isObjectNode} from './is-object-node'

export function isNode(value: any, schema: EditorSchema): value is Node {
  return (
    isText(value, schema) ||
    isElement(value, schema) ||
    isEditor(value) ||
    isObjectNode(value, schema)
  )
}
