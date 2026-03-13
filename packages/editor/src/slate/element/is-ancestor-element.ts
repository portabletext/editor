import type {EditorSchema} from '../../editor/editor-schema'
import type {Ancestor} from '../interfaces/node'
import {isObject} from '../utils/is-object'

export function isAncestorElement(
  value: any,
  schema: EditorSchema,
): value is Ancestor {
  return isObject(value) && value._type === schema.block.name
}
