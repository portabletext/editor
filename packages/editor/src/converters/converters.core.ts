import type {PortableTextMemberSchemaTypes} from '../types/editor'
import {converterJson} from './converter.json'
import {converterPortableText} from './converter.portable-text'
import {createConverterTextHtml} from './converter.text-html'
import {converterTextMarkdown} from './converter.text-markdown'
import {createConverterTextPlain} from './converter.text-plain'

export function createCoreConverters(
  legacySchema: PortableTextMemberSchemaTypes,
) {
  return [
    converterJson,
    converterPortableText,
    converterTextMarkdown,
    createConverterTextHtml(legacySchema),
    createConverterTextPlain(legacySchema),
  ]
}
