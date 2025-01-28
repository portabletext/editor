import {DEFAULT_SPAN} from '../../constants'
import {DeserializerRule} from '../../types'
import {isElement, tagName} from '../helpers'

export const spanRule: DeserializerRule = {
  deserialize: (node, next) => {
    if (
      isElement(node) &&
      tagName(node) === 'span' &&
      node.childNodes.length === 1 &&
      node.childNodes[0].nodeName === '#text'
    ) {
      return {
        ...DEFAULT_SPAN,
        marks: [],
        text: (node.childNodes[0].textContent ?? '').replace(/\s\s+/g, ' '),
      }
    }

    return undefined
  },
}
