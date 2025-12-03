import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {converterJson} from './converter.json'
import {converterPortableText} from './converter.portable-text'
import {createConverterTextHtml} from './converter.text-html'
import {createConverterTextPlain} from './converter.text-plain'

export function createCoreConverters(
  legacySchema: PortableTextMemberSchemaTypes,
) {
  return [
    converterJson,
    converterPortableText,
    createConverterTextHtml(legacySchema),
    createConverterTextPlain(legacySchema),
  ]
}
