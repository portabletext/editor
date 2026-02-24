import type {htmlToPortableText} from '../../../src'
import type {TypedObject} from '../../../src/types'

interface BlockContentFunctions {
  htmlToPortableText: typeof htmlToPortableText
}

export type BlockTestFn = (
  input: string,
  blockTools: BlockContentFunctions,
  commonOptions: {
    parseHtml: (html: string) => Document
    keyGenerator: () => string
  },
) => TypedObject[]
