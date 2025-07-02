import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock, PortableTextTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'

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
          terseBlock = `${terseBlock}${index > 0 ? ',' : ''}{${child._type}}`
        }
      }
    } else {
      terseBlock = `{${block._type}}`
    }

    blocks.push(terseBlock)
  }

  return blocks
}

export function parseTersePt(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'>,
  tersePt: Array<string>,
): Array<PortableTextBlock> {
  const blocks: Array<PortableTextBlock> = []

  for (const terseBlock of tersePt) {
    if (terseBlock.startsWith('{')) {
      blocks.push({
        _type: terseBlock.slice(1, -1),
        _key: context.keyGenerator(),
      })

      continue
    }

    const block: PortableTextTextBlock = {
      _key: context.keyGenerator(),
      _type: context.schema.block.name,
      children: [],
    }

    if (terseBlock.includes(':')) {
      const [prefix, content] = terseBlock.split(':')

      const listItem = prefix.includes('#')
        ? 'number'
        : prefix.includes('-')
          ? 'bullet'
          : undefined

      if (listItem !== undefined) {
        block.listItem = listItem
      }

      const level = prefix.split('').filter((part) => part === '>').length

      if (level > 0) {
        block.level = level
      }

      const style = prefix
        .split('')
        .filter((part) => !['#', '-', '>'].includes(part))
        .join('')

      if (style) {
        block.style = style
      }

      const textRuns = content.split(',')

      for (const textRun of textRuns) {
        if (textRun.startsWith('{')) {
          block.children.push({
            _key: context.keyGenerator(),
            _type: textRun.slice(1, -1),
          })
        } else {
          block.children.push({
            _key: context.keyGenerator(),
            _type: context.schema.span.name,
            text: textRun,
          })
        }
      }
    } else {
      const textRuns = terseBlock.split(',')

      for (const textRun of textRuns) {
        if (textRun.startsWith('{')) {
          block.children.push({
            _key: context.keyGenerator(),
            _type: textRun.slice(1, -1),
          })
        } else {
          block.children.push({
            _key: context.keyGenerator(),
            _type: context.schema.span.name,
            text: textRun,
          })
        }
      }
    }

    blocks.push(block)
  }

  return blocks
}

export function parseTersePtString(text: string) {
  return text.split('|').map((span) => span.replace(/\\n/g, '\n'))
}
