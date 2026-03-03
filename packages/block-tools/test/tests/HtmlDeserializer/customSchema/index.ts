import customSchema from '../../../fixtures/customSchema'
import type {BlockTestFn} from '../types'

const testFn: BlockTestFn = (html, blockTools, commonOptions) => {
  return blockTools.htmlToBlocks(html, customSchema, commonOptions)
}

export default testFn
