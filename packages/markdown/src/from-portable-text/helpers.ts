import type {PortableTextComponent, UnknownNodeType} from './types'

/**
 * Helper function that outputs unknown types as JSON code blocks.
 * Useful for debugging or preserving unknown content during development.
 *
 * @example
 * ```js
 * import {toMarkdown, jsonUnknownType} from '@portabletext/to-markdown'
 *
 * const markdown = toMarkdown(blocks, {
 *   components: {
 *     unknownType: jsonUnknownType
 *   }
 * })
 * ```
 */
export const jsonUnknownType: PortableTextComponent<UnknownNodeType> = ({
  value,
}) => {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

/**
 * Helper function that outputs unknown types as JSON with a comment header.
 * Includes the type name in a comment for easier identification.
 *
 * @example
 * ```js
 * import {toMarkdown, jsonUnknownTypeWithComment} from '@portabletext/to-markdown'
 *
 * const markdown = toMarkdown(blocks, {
 *   components: {
 *     unknownType: jsonUnknownTypeWithComment
 *   }
 * })
 * ```
 */
export const jsonUnknownTypeWithComment: PortableTextComponent<
  UnknownNodeType
> = ({value}) => {
  return `\`\`\`json\n// Unknown block type "${value._type}"\n${JSON.stringify(value, null, 2)}\n\`\`\``
}

/**
 * Helper function that outputs unknown types as a simple placeholder.
 * Useful when you want to mark unknown types without including full data.
 *
 * @example
 * ```js
 * import {toMarkdown, placeholderUnknownType} from '@portabletext/to-markdown'
 *
 * const markdown = toMarkdown(blocks, {
 *   components: {
 *     unknownType: placeholderUnknownType
 *   }
 * })
 * ```
 */
export const placeholderUnknownType: PortableTextComponent<UnknownNodeType> = ({
  value,
}) => {
  return `[TODO: Add component for type "${value._type}"]`
}
