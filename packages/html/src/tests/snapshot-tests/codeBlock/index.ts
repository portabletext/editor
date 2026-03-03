import {isElement} from '../../../deserializer/helpers'
import type {DeserializerRule} from '../../../types'
import defaultSchema from '../../fixtures/defaultSchema'
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

const testFn: BlockTestFn = (html, tools, commonOptions) => {
  return tools.htmlToPortableText(html, {
    schema: defaultSchema,
    ...commonOptions,
    rules,
  })
}

export default testFn
