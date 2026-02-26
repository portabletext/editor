import {PRESERVE_WHITESPACE_TAGS} from '../constants'
import {_XPathResult} from './xpath-result'

// Elements that only contain block-level children (not inline text content)
const BLOCK_CONTAINER_ELEMENTS = [
  'body',
  'table',
  'tbody',
  'thead',
  'tfoot',
  'tr',
  'ul',
  'ol',
]

export function preprocessWhitespace(_: string, doc: Document): Document {
  // Recursively process all nodes.
  function processNode(node: Node) {
    // If this is a text node and not inside a tag where whitespace should be preserved, process it.
    if (
      node.nodeType === _XPathResult.BOOLEAN_TYPE &&
      !PRESERVE_WHITESPACE_TAGS.includes(
        node.parentElement?.tagName.toLowerCase() || '',
      )
    ) {
      const normalized =
        node.textContent
          ?.replace(/\s\s+/g, ' ') // Remove multiple whitespace
          .replace(/[\r\n]+/g, ' ') || '' // Replace newlines with spaces
      const parentTag = node.parentElement?.tagName.toLowerCase()

      if (
        parentTag &&
        BLOCK_CONTAINER_ELEMENTS.includes(parentTag) &&
        normalized.trim() === ''
      ) {
        // If parent is a block container and text is only whitespace, remove it
        node.parentNode?.removeChild(node)
      } else {
        node.textContent = normalized
      }
    }
    // Otherwise, if this node has children, process them.
    else {
      // Process children in reverse to handle removals safely
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        processNode(node.childNodes[i])
      }
    }
  }

  // Process all nodes starting from the root.
  processNode(doc.body)

  return doc
}
