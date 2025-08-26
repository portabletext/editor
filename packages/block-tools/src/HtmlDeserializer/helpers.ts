import type {Schema} from '@portabletext/schema'
import {
  isTextBlock,
  type PortableTextObject,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {vercelStegaClean} from '@vercel/stega'
import {isEqual} from 'lodash'
import {DEFAULT_BLOCK} from '../constants'
import type {
  ArbitraryTypedObject,
  HtmlParser,
  HtmlPreprocessorOptions,
  MinimalBlock,
  MinimalSpan,
  PlaceholderAnnotation,
  PlaceholderDecorator,
  TypedObject,
} from '../types'
import {resolveJsType} from '../util/resolveJsType'
import preprocessors from './preprocessors'

/**
 * Utility function that always return a lowerCase version of the element.tagName
 *
 * @param el - Element to get tag name for
 * @returns Lowercase tagName for that element, or undefined if not an element
 */
export function tagName(el: HTMLElement | Node | null): string | undefined {
  if (el && 'tagName' in el) {
    return el.tagName.toLowerCase()
  }

  return undefined
}

// TODO: make this plugin-style
export function preprocess(
  html: string,
  parseHtml: HtmlParser,
  options: HtmlPreprocessorOptions,
): Document {
  const cleanHTML = vercelStegaClean(html)
  const doc = parseHtml(normalizeHtmlBeforePreprocess(cleanHTML))
  preprocessors.forEach((processor) => {
    processor(cleanHTML, doc, options)
  })
  return doc
}

function normalizeHtmlBeforePreprocess(html: string): string {
  return html.trim()
}

/**
 * A default `parseHtml` function that returns the html using `DOMParser`.
 *
 * @returns HTML Parser based on `DOMParser`
 */
export function defaultParseHtml(): HtmlParser {
  if (resolveJsType(DOMParser) === 'undefined') {
    throw new Error(
      'The native `DOMParser` global which the `Html` deserializer uses by ' +
        'default is not present in this environment. ' +
        'You must supply the `options.parseHtml` function instead.',
    )
  }
  return (html) => {
    return new DOMParser().parseFromString(html, 'text/html')
  }
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

/**
 * NOTE: _mutates_ passed blocks!
 *
 * @param blocks - Array of blocks to trim whitespace for
 * @returns
 */
export function trimWhitespace(
  schema: Schema,
  blocks: TypedObject[],
): TypedObject[] {
  blocks.forEach((block) => {
    if (!isTextBlock({schema}, block)) {
      return
    }

    // eslint-disable-next-line complexity
    block.children.forEach((child, index) => {
      if (!isMinimalSpan(child)) {
        return
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
        isEqual(prevChild.marks, child.marks) &&
        isWhiteSpaceChar(child.text)
      ) {
        prevChild.text += ' '
        block.children.splice(index, 1)
      } else if (
        nextChild &&
        isEqual(nextChild.marks, child.marks) &&
        isWhiteSpaceChar(child.text)
      ) {
        nextChild.text = ` ${nextChild.text}`
        block.children.splice(index, 1)
      }
    })
  })

  return blocks
}

export function ensureRootIsBlocks(
  schema: Schema,
  objects: Array<ArbitraryTypedObject>,
): ArbitraryTypedObject[] {
  return objects.reduce((blocks, node, i, original) => {
    if (node._type === 'block') {
      blocks.push(node)
      return blocks
    }

    if (node._type === '__block') {
      blocks.push((node as any).block)
      return blocks
    }

    const lastBlock = blocks[blocks.length - 1]
    if (
      i > 0 &&
      !isTextBlock({schema}, original[i - 1]) &&
      isTextBlock({schema}, lastBlock)
    ) {
      lastBlock.children.push(node as PortableTextObject)
      return blocks
    }

    const block = {
      ...DEFAULT_BLOCK,
      children: [node],
    }

    blocks.push(block)
    return blocks
  }, [] as ArbitraryTypedObject[])
}

export function isNodeList(node: unknown): node is NodeList {
  return Object.prototype.toString.call(node) === '[object NodeList]'
}

export function isMinimalSpan(node: TypedObject): node is MinimalSpan {
  return node._type === 'span'
}

export function isMinimalBlock(node: TypedObject): node is MinimalBlock {
  return node._type === 'block'
}

export function isPlaceholderDecorator(
  node: TypedObject,
): node is PlaceholderDecorator {
  return node._type === '__decorator'
}

export function isPlaceholderAnnotation(
  node: TypedObject,
): node is PlaceholderAnnotation {
  return node._type === '__annotation'
}

export function isElement(node: Node): node is Element {
  return node.nodeType === 1
}

/**
 * Helper to normalize whitespace to only 1 empty block between content nodes
 * @param node - Root node to process
 */
export function normalizeWhitespace(rootNode: Node) {
  let emptyBlockCount = 0
  let lastParent = null
  const nodesToRemove: Node[] = []

  for (let child = rootNode.firstChild; child; child = child.nextSibling) {
    if (!isElement(child)) {
      normalizeWhitespace(child)
      emptyBlockCount = 0
      continue
    }

    const elm = child as HTMLElement

    if (isWhitespaceBlock(elm)) {
      if (lastParent && elm.parentElement === lastParent) {
        emptyBlockCount++
        if (emptyBlockCount > 1) {
          nodesToRemove.push(elm)
        }
      } else {
        // Different parent, reset counter
        emptyBlockCount = 1
      }

      lastParent = elm.parentElement
    } else {
      // Recurse into child nodes
      normalizeWhitespace(child)
      // Reset counter for siblings
      emptyBlockCount = 0
    }
  }

  // Remove marked nodes
  nodesToRemove.forEach((node) => {
    node.parentElement?.removeChild(node)
  })
}

/**
 * Helper to remove all whitespace nodes
 * @param node - Root node to process
 */
export function removeAllWhitespace(rootNode: Node) {
  const nodesToRemove: Node[] = []

  function collectNodesToRemove(currentNode: Node) {
    if (isElement(currentNode)) {
      const elm = currentNode as HTMLElement

      // Handle <br> tags that is between <p> tags
      if (
        tagName(elm) === 'br' &&
        (tagName(elm.nextElementSibling) === 'p' ||
          tagName(elm.previousElementSibling) === 'p')
      ) {
        nodesToRemove.push(elm)

        return
      }

      // Handle empty blocks
      if (
        (tagName(elm) === 'p' || tagName(elm) === 'br') &&
        elm?.firstChild?.textContent?.trim() === ''
      ) {
        nodesToRemove.push(elm)

        return
      }

      // Recursively process child nodes
      for (let child = elm.firstChild; child; child = child.nextSibling) {
        collectNodesToRemove(child)
      }
    }
  }

  collectNodesToRemove(rootNode)

  // Remove the collected nodes
  nodesToRemove.forEach((node) => {
    node.parentElement?.removeChild(node)
  })
}

function isWhitespaceBlock(elm: HTMLElement): boolean {
  return ['p', 'br'].includes(tagName(elm) || '') && !elm.textContent?.trim()
}
