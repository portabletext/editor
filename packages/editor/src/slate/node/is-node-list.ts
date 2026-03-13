import type {EditorSchema} from '../../editor/editor-schema'
import type {Node} from '../interfaces/node'
import {isNode} from './is-node'

export function isNodeList(value: any, schema: EditorSchema): value is Node[] {
  return Array.isArray(value) && value.every((val) => isNode(val, schema))
}
