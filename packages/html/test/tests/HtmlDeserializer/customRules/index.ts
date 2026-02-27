import {isElement} from '../../../../src/HtmlDeserializer/helpers'
import type {DeserializerRule} from '../../../../src/types'
import {defaultSchema} from '../schemas'
import type {BlockTestFn} from '../types'

const rules: DeserializerRule[] = [
  // Map 'em' tags to 'strong'
  {
    deserialize(el, next) {
      if (!isElement(el) || el.tagName.toLowerCase() !== 'em') {
        return undefined
      }
      return {
        _type: '__decorator',
        name: 'strong',
        children: next(el.childNodes),
      }
    },
  },
  {
    // Special case for code blocks (wrapped in pre and code tag)
    deserialize(el, _next) {
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
      return {
        _type: 'span',
        marks: ['code'],
        text: text,
      }
    },
  },
  {
    deserialize(el, _next) {
      if (!isElement(el) || el.tagName.toLowerCase() !== 'img') {
        return undefined
      }
      const result: any[] = [
        {
          _type: 'image',
          src: el.getAttribute('src'),
        },
      ]
      if ((el.parentNode as HTMLElement)?.tagName?.toLowerCase() === 'a') {
        result.push({
          _type: 'span',
          text: 'Image link',
        })
      }
      return result
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
