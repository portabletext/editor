import type {htmlToPortableText} from '../../index'
import type {TypedObject} from '../../types'

interface HtmlTools {
  htmlToPortableText: typeof htmlToPortableText
}

export type BlockTestFn = (
  input: string,
  tools: HtmlTools,
  commonOptions: {
    parseHtml: (html: string) => Document
    keyGenerator: () => string
  },
) => TypedObject[]
