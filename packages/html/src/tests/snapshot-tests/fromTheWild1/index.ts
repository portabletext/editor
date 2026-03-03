import defaultSchema from '../../fixtures/defaultSchema'
import type {BlockTestFn} from '../types'

const testFn: BlockTestFn = (html, tools, commonOptions) => {
  return tools.htmlToPortableText(html, {
    schema: defaultSchema,
    ...commonOptions,
  })
}

export default testFn
