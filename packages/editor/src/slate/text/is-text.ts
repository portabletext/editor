import type {EditorSchema} from '../../editor/editor-schema'
import type {Text} from '../interfaces/text'
import {isObject} from '../utils/is-object'

export function isText(value: any, schema: EditorSchema): value is Text {
  return isObject(value) && value._type === schema.span.name
}
