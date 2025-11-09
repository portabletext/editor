import {
  isBlockObject,
  isContainerBlock,
  isSpan,
  isTextBlock,
} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * Recursively extracts text from blocks, handling nested container blocks
 */
function extractTextFromBlock(context: any, block: PortableTextBlock): string {
  if (isBlockObject(context, block)) {
    return ''
  }

  if (isContainerBlock(context, block)) {
    // Check if children are blocks or spans
    if ('children' in block && Array.isArray(block.children)) {
      const firstChild = block.children[0]
      if (firstChild && firstChild._type === context.schema.span.name) {
        // Children are spans - treat as text block
        return block.children.reduce((text: string, child: any) => {
          if (isSpan(context, child)) {
            return text + child.text
          }
          return text
        }, '')
      }

      // Children are blocks - recursively extract text from all children
      return block.children
        .map((child) =>
          extractTextFromBlock(context, child as PortableTextBlock),
        )
        .join('')
    }
  }

  if (isTextBlock(context, block)) {
    return block.children.reduce((text: string, child: any) => {
      if (isSpan(context, child)) {
        return text + child.text
      }
      return text
    }, '')
  }

  return ''
}

/**
 * @public
 */
export const getSelectionText: EditorSelector<string> = (snapshot) => {
  const selectedValue = getSelectedValue(snapshot)

  return selectedValue
    .map((block) => extractTextFromBlock(snapshot.context, block))
    .join('')
}
