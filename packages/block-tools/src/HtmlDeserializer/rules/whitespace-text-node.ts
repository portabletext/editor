import {DEFAULT_SPAN} from '../../constants'
import type {DeserializerRule} from '../../types'
import {tagName} from '../helpers'

export const whitespaceTextNodeRule: DeserializerRule = {
  deserialize(node) {
    return node.nodeName === '#text' && isWhitespaceTextNode(node)
      ? {
          ...DEFAULT_SPAN,
          marks: [],
          text: (node.textContent ?? '').replace(/\s\s+/g, ' '),
        }
      : undefined
  },
}

function isWhitespaceTextNode(node: Node) {
  const isValidWhiteSpace =
    node.nodeType === 3 &&
    (node.textContent || '').replace(/[\r\n]/g, ' ').replace(/\s\s+/g, ' ') ===
      ' ' &&
    node.nextSibling &&
    node.nextSibling.nodeType !== 3 &&
    node.previousSibling &&
    node.previousSibling.nodeType !== 3

  return (
    (isValidWhiteSpace || node.textContent !== ' ') &&
    tagName(node.parentNode) !== 'body'
  )
}
