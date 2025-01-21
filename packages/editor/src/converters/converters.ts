import {converterJson} from './converter.json'
import {converterPortableText} from './converter.portable-text'
import {converterTextHtml} from './converter.text-html'
import {converterTextPlain} from './converter.text-plain'

export const converters = {
  [converterJson.mimeType]: converterJson,
  [converterPortableText.mimeType]: converterPortableText,
  [converterTextHtml.mimeType]: converterTextHtml,
  [converterTextPlain.mimeType]: converterTextPlain,
} as const

export const coreConverters = [
  converterJson,
  converterPortableText,
  converterTextHtml,
  converterTextPlain,
]
