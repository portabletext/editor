import type {Schema} from '@portabletext/schema'
import {isTextBlock, type PortableTextObject} from '@portabletext/schema'
import {DEFAULT_BLOCK} from '../constants'
import type {
  ArbitraryTypedObject,
  HtmlParser,
  MinimalBlock,
  MinimalSpan,
  PlaceholderAnnotation,
  PlaceholderDecorator,
  TypedObject,
} from '../types'
import {resolveJsType} from '../util/resolveJsType'

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
