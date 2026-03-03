import defaultSchema from '../../../fixtures/defaultSchema'
import type {BlockTestFn} from '../types'

const testFn: BlockTestFn = (html, blockTools, commonOptions) => {
  return blockTools.htmlToBlocks(html, defaultSchema, commonOptions)
}

export default testFn
