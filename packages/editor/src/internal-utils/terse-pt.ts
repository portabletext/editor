import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'

type TersePtConfig = {
  style: (name?: string) => string
  listItem: (name?: string) => string
  level: (level?: number) => string
}

const defaultConfig: TersePtConfig = {
  style: (name) =>
    name === undefined || name === 'normal'
      ? ''
      : name === 'blockquote'
        ? 'q'
        : `${name}`,
  listItem: (name) => (name === undefined ? '' : name === 'number' ? '#' : '-'),
  level: (level) => (level === undefined ? '' : '>'.repeat(level)),
}

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
      const blockPrefix = `${defaultConfig.level(block.level)}${defaultConfig.listItem(block.listItem)}${defaultConfig.style(block.style)}`

      if (blockPrefix) {
        blocks.push(`${blockPrefix}:`)
      }

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
