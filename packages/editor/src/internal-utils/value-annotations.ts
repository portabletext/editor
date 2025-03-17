import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'

export function getValueAnnotations(
  value: Array<PortableTextBlock> | undefined,
): Array<string> {
  if (!value) {
    return []
  }

  const annotations: Array<string> = []

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child) && child.marks) {
          for (const mark of child.marks) {
            if (
              block.markDefs?.some((markDef) => markDef._key === mark) &&
              !annotations.includes(mark)
            ) {
              annotations.push(mark)
            }
          }
        }
      }
    }
  }

  return annotations
}
