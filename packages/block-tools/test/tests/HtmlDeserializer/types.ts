import type {htmlToBlocks, normalizeBlock} from '../../../src'
import type {TypedObject} from '../../../src/types'

interface BlockContentFunctions {
  normalizeBlock: typeof normalizeBlock
  htmlToBlocks: typeof htmlToBlocks
}

export type BlockTestFn = (
  input: string,
  blockTools: BlockContentFunctions,
  commonOptions: {
    parseHtml: (html: string) => Document
    keyGenerator: () => string
  },
) => TypedObject[]
