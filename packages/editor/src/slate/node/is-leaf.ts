import type {EditorSchema} from '../../editor/editor-schema'
import {isText} from '../text/is-text'
import {isObjectNode} from './is-object-node'

export function isLeaf(value: any, schema: EditorSchema): boolean {
  return isText(value, schema) || isObjectNode(value, schema)
}
