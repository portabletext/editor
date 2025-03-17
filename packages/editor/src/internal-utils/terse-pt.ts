import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'

export function getTersePt(value: Array<PortableTextBlock> | undefined) {
  if (!value) {
    return undefined
  }

  const blocks: Array<string> = []

  for (const block of value) {
    if (blocks.length > 0) {
      blocks.push('|')
    }
    if (isPortableTextBlock(block)) {
      for (const child of block.children) {
        if (isPortableTextSpan(child)) {
          blocks.push(child.text)
        } else {
          blocks.push(`[${child._type}]`)
        }
      }
    } else {
      blocks.push(`[${block._type}]`)
    }
  }

  return blocks
}

export function parseTersePt(text: string) {
  return text
    .replace(/\|/g, ',|,')
    .split(',')
    .map((span) => span.replace(/\\n/g, '\n'))
}
