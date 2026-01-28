import {converterJson} from './converter.json'
import {converterPortableText} from './converter.portable-text'
import {converterTextHtml} from './converter.text-html'
import {converterTextMarkdown} from './converter.text-markdown'
import {converterTextPlain} from './converter.text-plain'

export const coreConverters = [
  converterJson,
  converterPortableText,
  converterTextMarkdown,
  converterTextHtml,
  converterTextPlain,
]
