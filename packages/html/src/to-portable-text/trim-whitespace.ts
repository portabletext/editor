import {
  isSpan,
  isTextBlock,
  type PortableTextTextBlock,
  type Schema,
} from '@portabletext/schema'
import {isEqualMarks} from './equality'
import type {TypedObject, WhiteSpacePasteMode} from './types'
import {isMinimalSpan} from './helpers'

export function trimWhitespace(
  context: {schema: Schema},
  mode: WhiteSpacePasteMode,
  blocks: TypedObject[],
): TypedObject[] {
  const trimmedBlocks: TypedObject[] = []
  let consecutiveEmptyCount = 0

  for (const block of blocks) {
    const trimmedBlock = isTextBlock(context, block)
      ? trimTextBlockWhitespace(block)
      : block

    if (mode === 'preserve') {
      trimmedBlocks.push(trimmedBlock)

      continue
    }

    if (mode === 'remove') {
      if (isEmptyTextBlock(context, trimmedBlock)) {
        continue
      }

      trimmedBlocks.push(trimmedBlock)

      continue
    }

    if (mode === 'normalize') {
      if (isEmptyTextBlock(context, trimmedBlock)) {
        consecutiveEmptyCount++

        if (consecutiveEmptyCount === 1) {
          trimmedBlocks.push(trimmedBlock)
        }

        continue
      }

      trimmedBlocks.push(trimmedBlock)

      consecutiveEmptyCount = 0
    }
  }

  return trimmedBlocks
}

function isEmptyTextBlock(
  context: {schema: Schema},
  block: TypedObject,
): boolean {
  if (!isTextBlock(context, block)) {
    return false
  }

  if (
    block.children.some(
      (child) => !isSpan(context, child) || child.text.trim() !== '',
    )
  ) {
    return false
  }

  return true
}

function trimTextBlockWhitespace(
  block: PortableTextTextBlock,
): PortableTextTextBlock {
  let index = 0

  for (const child of block.children) {
    if (!isMinimalSpan(child)) {
      index++
      continue
    }

    const nextChild = nextSpan(block, index)
    const prevChild = prevSpan(block, index)

    if (index === 0) {
      child.text = child.text.replace(/^[^\S\n]+/g, '')
    }

    if (index === block.children.length - 1) {
      child.text = child.text.replace(/[^\S\n]+$/g, '')
    }

    if (
      /\s/.test(child.text.slice(Math.max(0, child.text.length - 1))) &&
      nextChild &&
      isMinimalSpan(nextChild) &&
      /\s/.test(nextChild.text.slice(0, 1))
    ) {
      child.text = child.text.replace(/[^\S\n]+$/g, '')
    }

    if (
      /\s/.test(child.text.slice(0, 1)) &&
      prevChild &&
      isMinimalSpan(prevChild) &&
      /\s/.test(prevChild.text.slice(Math.max(0, prevChild.text.length - 1)))
    ) {
      child.text = child.text.replace(/^[^\S\n]+/g, '')
    }

    if (!child.text) {
      block.children.splice(index, 1)
    }

    if (
      prevChild &&
      Array.isArray(prevChild.marks) &&
      isEqualMarks(prevChild.marks, child.marks) &&
      isWhiteSpaceChar(child.text)
    ) {
      prevChild.text += ' '
      block.children.splice(index, 1)
    } else if (
      nextChild &&
      Array.isArray(nextChild.marks) &&
      isEqualMarks(nextChild.marks, child.marks) &&
      isWhiteSpaceChar(child.text)
    ) {
      nextChild.text = ` ${nextChild.text}`
      block.children.splice(index, 1)
    }

    index++
  }

  return block
}

function nextSpan(block: PortableTextTextBlock, index: number) {
  const next = block.children[index + 1]
  return next && next._type === 'span' ? next : null
}

function prevSpan(block: PortableTextTextBlock, index: number) {
  const prev = block.children[index - 1]
  return prev && prev._type === 'span' ? prev : null
}

function isWhiteSpaceChar(text: string) {
  return ['\xa0', ' '].includes(text)
}
