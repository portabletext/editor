import {customSchema} from '../schemas'
import type {BlockTestFn} from '../types'

const testFn: BlockTestFn = (html, blockTools, commonOptions) => {
  return blockTools.htmlToPortableText(html, {
    ...commonOptions,
    schema: customSchema,
  })
}

export default testFn
