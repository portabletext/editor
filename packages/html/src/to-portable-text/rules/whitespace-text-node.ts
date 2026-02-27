import {DEFAULT_SPAN} from '../constants'
import type {DeserializerRule} from '../types'
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
  const isWhitespaceOnly =
    node.nodeType === 3 &&
    (node.textContent || '').replace(/[\r\n]/g, ' ').replace(/\s\s+/g, ' ') ===
      ' '

  const hasSiblingContext =
    node.nextSibling &&
    node.nextSibling.nodeType !== 3 &&
    node.previousSibling &&
    node.previousSibling.nodeType !== 3

  // When a whitespace text node is the sole child of an inline element (e.g.
  // <span> </span>), check the parent element's siblings instead.
  const parentIsInline = node.parentNode && tagName(node.parentNode) === 'span'
  const hasParentSiblingContext =
    parentIsInline &&
    !node.nextSibling &&
    !node.previousSibling &&
    node.parentNode!.previousSibling &&
    node.parentNode!.previousSibling.nodeType !== 3 &&
    node.parentNode!.nextSibling &&
    node.parentNode!.nextSibling.nodeType !== 3

  const isValidWhiteSpace =
    isWhitespaceOnly && (hasSiblingContext || hasParentSiblingContext)

  return (
    (isValidWhiteSpace || node.textContent !== ' ') &&
    tagName(node.parentNode) !== 'body'
  )
}
