import type {EditorSchema} from '../../editor/editor-schema'
import type {ObjectNode} from '../interfaces/node'
import {isObject} from '../utils/is-object'

export function isObjectNode(
  value: any,
  schema: EditorSchema,
): value is ObjectNode {
  return (
    isObject(value) &&
    typeof value._type === 'string' &&
    typeof value._key === 'string' &&
    value._type !== schema.block.name &&
    value._type !== schema.span.name
  )
}
