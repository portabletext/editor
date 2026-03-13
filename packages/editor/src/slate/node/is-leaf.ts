import type {EditorSchema} from '../../editor/editor-schema'
import {Text} from '../interfaces/text'
import {isObjectNode} from './is-object-node'

export function isLeaf(value: any, schema: EditorSchema): boolean {
  return Text.isText(value, schema) || isObjectNode(value, schema)
}
