import {isPortableTextBlock} from '@portabletext/toolkit'
import {isPortableTextSpan, type PortableTextBlock} from '@sanity/types'

export function getTextBlockKey(
  value: Array<PortableTextBlock> | undefined,
  text: string,
) {
  if (!value) {
    throw new Error(`Unable to find block key for text "${text}"`)
  }

  let blockKey: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.text === text) {
          blockKey = block._key
          break
        }
      }
    }
  }

  if (!blockKey) {
    throw new Error(`Unable to find block key for text "${text}"`)
  }

  return blockKey
}
