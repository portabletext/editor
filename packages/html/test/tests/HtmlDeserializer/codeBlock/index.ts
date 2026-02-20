import {isElement} from '../../../../src/HtmlDeserializer/helpers'
import type {DeserializerRule} from '../../../../src/types'
import {defaultSchema} from '../schemas'
import type {BlockTestFn} from '../types'

const rules: DeserializerRule[] = [
  {
    // Special case for code blocks (wrapped in pre and code tag)
    deserialize(el, _next, block) {
      if (!isElement(el) || el.tagName.toLowerCase() !== 'pre') {
        return undefined
      }
      const code = el.children[0]
      const childNodes =
        code && code.tagName.toLowerCase() === 'code'
          ? code.childNodes
          : el.childNodes
      let text = ''
      childNodes.forEach((node) => {
        text += node.textContent
      })
      return block({
        _type: 'code',
        text: text,
      })
    },
  },
]

const testFn: BlockTestFn = (html, blockTools, commonOptions) => {
  const options = {
    ...commonOptions,
    schema: defaultSchema,
    rules,
  }
  return blockTools.htmlToPortableText(html, options)
}

export default testFn
