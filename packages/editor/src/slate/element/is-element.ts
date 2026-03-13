import type {EditorSchema} from '../../editor/editor-schema'
import type {Element} from '../interfaces/element'
import {isObject} from '../utils/is-object'

export function isElement(value: any, schema: EditorSchema): value is Element {
  return isObject(value) && value._type === schema.block.name
}
