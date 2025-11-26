import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
} from '@portabletext/toolkit'
import type {TypedObject} from '@portabletext/types'

/**
 * @public
 */
export type BlockSpacingRenderer = (options: {
  current: TypedObject
  next: TypedObject
}) => string | undefined

/**
 * @public
 */
export const DefaultBlockSpacingRenderer: BlockSpacingRenderer = ({
  current,
  next,
}) => {
  if (
    isPortableTextListItemBlock(current) &&
    isPortableTextListItemBlock(next)
  ) {
    return '\n'
  }

  if (
    isPortableTextBlock(current) &&
    isPortableTextBlock(next) &&
    current.style === 'blockquote' &&
    next.style === 'blockquote'
  ) {
    return '\n>\n'
  }

  return '\n\n'
}
