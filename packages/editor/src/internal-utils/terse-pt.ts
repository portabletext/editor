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

export function getTersePt(
  value: Array<PortableTextBlock> | undefined,
): Array<string> {
  if (!value) {
    return []
  }

  const blocks: Array<string> = []

  for (const block of value) {
    let terseBlock = ''

    if (isPortableTextBlock(block)) {
      const blockPrefix = `${defaultConfig.level(block.level)}${defaultConfig.listItem(block.listItem)}${defaultConfig.style(block.style)}`

      if (blockPrefix) {
        terseBlock = `${blockPrefix}:`
      }

      let index = -1
      for (const child of block.children) {
        index++

        if (isPortableTextSpan(child)) {
          terseBlock = `${terseBlock}${index > 0 ? ',' : ''}${child.text}`
        } else {
          terseBlock = `${terseBlock}${index > 0 ? ',' : ''}[${child._type}]`
        }
      }
    } else {
      terseBlock = `[${block._type}]`
    }

    blocks.push(terseBlock)
  }

  return blocks
}

export function parseTersePt(text: string) {
  return text.split('|').map((span) => span.replace(/\\n/g, '\n'))
}
