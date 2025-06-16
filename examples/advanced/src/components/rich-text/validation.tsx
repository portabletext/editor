import {sanitize} from '@/lib/sanitize'
import {PortableTextType} from '@/types/rich-text'

export const sanitizePortableTextBlock = (
  input: PortableTextType | Array<PortableTextType>,
): PortableTextType | Array<PortableTextType> => {
  // If the input is an array, recursively sanitize each item
  if (Array.isArray(input)) {
    return input.map(
      (item) => sanitizePortableTextBlock(item) as PortableTextType,
    )
  }
  // If the input is an object, recursively sanitize its properties
  if (input !== null && typeof input === 'object') {
    const block = {...input}

    // If the block has a "children" array, recursively sanitize it
    if ('children' in block && Array.isArray(block.children)) {
      block.children = sanitizePortableTextBlock(
        block.children,
      ) as Array<PortableTextType>
    }

    // Sanitize the "text" field if it exists
    if ('text' in block && typeof block.text === 'string') {
      block.text = sanitize(block.text)
    }

    return block
  }
  // If the input is not an array or object, return it as is
  return input
}

export const isPortableTextBlockEmpty = (
  input: PortableTextType | Array<PortableTextType>,
): boolean => {
  if (Array.isArray(input) && input.length === 1) {
    if ('children' in input[0]) {
      const value = input[0].children
      if (Array.isArray(value) && value.length === 1) {
        if (value[0].text.trim() === '') {
          return true
        }
      }
    }
  }
  return false
}
