import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'

export function getTextMarks(
  value: Array<PortableTextBlock> | undefined,
  text: string,
) {
  if (!value) {
    return undefined
  }

  let marks: Array<string> | undefined = undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.text === text) {
          marks = child.marks ?? []
          break
        }
      }
    }
  }

  return marks
}
