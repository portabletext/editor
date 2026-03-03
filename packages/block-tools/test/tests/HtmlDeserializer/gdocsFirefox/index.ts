import defaultSchema from '../../../fixtures/defaultSchema'
import type {BlockTestFn} from '../types'

const testFn: BlockTestFn = (html, blockTools, commonOptions) => {
  return blockTools.htmlToBlocks(html, defaultSchema, {
    ...commonOptions,
    unstable_whitespaceOnPasteMode: 'normalize',
  })
}

export default testFn
