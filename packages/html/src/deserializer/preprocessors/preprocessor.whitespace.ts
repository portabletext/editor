import {PRESERVE_WHITESPACE_TAGS} from '../constants'
import {hasMonospaceFontFamily, hasPreservedWhitespaceStyle} from '../helpers'
import {_XPathResult} from './xpathResult'

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
      ) &&
      // Whitespace inside monospace elements that also declare a
      // whitespace-preserving `white-space` is content (e.g. code
      // indentation in Google Docs, where code lines are spans carrying a
      // monospace `font-family` and `white-space:pre-wrap` rather than
      // `pre`/`code` tags). Monospace alone is not enough: Word styles code
      // spans with monospace fonts but wraps its HTML source freely, so its
      // intra-span whitespace is formatting, not content.
      !(
        node.parentElement &&
        hasMonospaceFontFamily(node.parentElement) &&
        hasPreservedWhitespaceStyle(node.parentElement)
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
        const child = node.childNodes[i]
        if (child) {
          processNode(child)
        }
      }
    }
  }

  // Process all nodes starting from the root.
  processNode(doc.body)

  return doc
}
