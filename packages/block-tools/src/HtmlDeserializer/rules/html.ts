import type {Schema} from '@portabletext/schema'
import {
  DEFAULT_BLOCK,
  DEFAULT_SPAN,
  HTML_BLOCK_TAGS,
  HTML_DECORATOR_TAGS,
  HTML_HEADER_TAGS,
  HTML_LIST_CONTAINER_TAGS,
  HTML_LIST_ITEM_TAGS,
  HTML_SPAN_TAGS,
  type PartialBlock,
} from '../../constants'
import type {SchemaMatchers} from '../../schema-matchers'
import type {DeserializerRule} from '../../types'
import {keyGenerator} from '../../util/randomKey'
import {isElement, tagName} from '../helpers'
import {whitespaceTextNodeRule} from './whitespace-text-node'

export function resolveListItem(
  schema: Schema,
  listNodeTagName: string,
): string | undefined {
  if (
    listNodeTagName === 'ul' &&
    schema.lists.some((list) => list.name === 'bullet')
  ) {
    return 'bullet'
  }
  if (
    listNodeTagName === 'ol' &&
    schema.lists.some((list) => list.name === 'number')
  ) {
    return 'number'
  }
  return undefined
}

export default function createHTMLRules(
  schema: Schema,
  options: {keyGenerator?: () => string; matchers?: SchemaMatchers},
): DeserializerRule[] {
  return [
    whitespaceTextNodeRule,
    {
      // Pre element
      deserialize(el) {
        if (tagName(el) !== 'pre') {
          return undefined
        }

        const isCodeEnabled = schema.styles.some(
          (style) => style.name === 'code',
        )

        return {
          _type: 'block',
          style: 'normal',
          markDefs: [],
          children: [
            {
              ...DEFAULT_SPAN,
              marks: isCodeEnabled ? ['code'] : [],
              text: el.textContent || '',
            },
          ],
        }
      },
    }, // Blockquote element
    {
      deserialize(el, next) {
        if (tagName(el) !== 'blockquote') {
          return undefined
        }
        const blocks: Record<string, PartialBlock | undefined> = {
          ...HTML_BLOCK_TAGS,
          ...HTML_HEADER_TAGS,
        }
        delete blocks.blockquote
        const nonBlockquoteBlocks = Object.keys(blocks)

        const children: HTMLElement[] = []

        el.childNodes.forEach((node, index) => {
          if (!el.ownerDocument) {
            return
          }

          if (
            node.nodeType === 1 &&
            nonBlockquoteBlocks.includes(
              (node as Element).localName.toLowerCase(),
            )
          ) {
            const span = el.ownerDocument.createElement('span')

            const previousChild = children[children.length - 1]

            if (
              previousChild &&
              previousChild.nodeType === 3 &&
              previousChild.textContent?.trim()
            ) {
              // Only prepend line break if the previous node is a non-empty
              // text node.
              span.appendChild(el.ownerDocument.createTextNode('\r'))
            }

            node.childNodes.forEach((cn) => {
              span.appendChild(cn.cloneNode(true))
            })

            if (index !== el.childNodes.length) {
              // Only append line break if this is not the last child
              span.appendChild(el.ownerDocument.createTextNode('\r'))
            }

            children.push(span)
          } else {
            children.push(node as HTMLElement)
          }
        })

        return {
          _type: 'block',
          style: 'blockquote',
          markDefs: [],
          children: next(children),
        }
      },
    }, // Block elements
    {
      deserialize(el, next) {
        const blocks: Record<string, PartialBlock | undefined> = {
          ...HTML_BLOCK_TAGS,
          ...HTML_HEADER_TAGS,
        }
        const tag = tagName(el)
        let block = tag ? blocks[tag] : undefined
        if (!block) {
          return undefined
        }
        // Don't add blocks into list items
        if (el.parentNode && tagName(el.parentNode) === 'li') {
          return next(el.childNodes)
        }
        const blockStyle = block.style
        // If style is not supported, return a defaultBlockType
        if (!schema.styles.some((style) => style.name === blockStyle)) {
          block = DEFAULT_BLOCK
        }
        return {
          ...block,
          children: next(el.childNodes),
        }
      },
    }, // Ignore span tags
    {
      deserialize(el, next) {
        const tag = tagName(el)
        if (!tag || !(tag in HTML_SPAN_TAGS)) {
          return undefined
        }
        return next(el.childNodes)
      },
    }, // Ignore div tags
    {
      deserialize(el, next) {
        const div = tagName(el) === 'div'
        if (!div) {
          return undefined
        }
        return next(el.childNodes)
      },
    }, // Ignore list containers
    {
      deserialize(el, next) {
        const tag = tagName(el)
        if (!tag || !(tag in HTML_LIST_CONTAINER_TAGS)) {
          return undefined
        }
        return next(el.childNodes)
      },
    }, // Deal with br's
    {
      deserialize(el) {
        if (tagName(el) === 'br') {
          return {
            ...DEFAULT_SPAN,
            text: '\n',
          }
        }
        return undefined
      },
    }, // Deal with list items
    {
      deserialize(el, next, block) {
        const tag = tagName(el)
        const listItem = tag ? HTML_LIST_ITEM_TAGS[tag] : undefined
        const parentTag = tagName(el.parentNode) || ''
        if (
          !listItem ||
          !el.parentNode ||
          !HTML_LIST_CONTAINER_TAGS[parentTag]
        ) {
          return undefined
        }
        const enabledListItem = resolveListItem(schema, parentTag)
        // If the list item style is not supported, return a new default block
        if (!enabledListItem) {
          return block({_type: 'block', children: next(el.childNodes)})
        }
        listItem.listItem = enabledListItem
        return {
          ...listItem,
          children: next(el.childNodes),
        }
      },
    }, // Deal with decorators - this is a limited set of known html elements that we know how to deserialize
    {
      deserialize(el, next) {
        const decorator = HTML_DECORATOR_TAGS[tagName(el) || '']
        if (
          !decorator ||
          !schema.decorators.some(
            (decoratorType) => decoratorType.name === decorator,
          )
        ) {
          return undefined
        }
        return {
          _type: '__decorator',
          name: decorator,
          children: next(el.childNodes),
        }
      },
    }, // Special case for hyperlinks, add annotation (if allowed by schema),
    // If not supported just write out the link text and href in plain text.
    {
      deserialize(el, next) {
        if (tagName(el) !== 'a') {
          return undefined
        }
        const linkEnabled = schema.annotations.some(
          (annotation) => annotation.name === 'link',
        )
        const href = isElement(el) && el.getAttribute('href')
        if (!href) {
          return next(el.childNodes)
        }
        if (linkEnabled) {
          return {
            _type: '__annotation',
            markDef: {
              _key: options.keyGenerator
                ? options.keyGenerator()
                : keyGenerator(),
              _type: 'link',
              href: href,
            },
            children: next(el.childNodes),
          }
        }
        return (
          el.appendChild(el.ownerDocument.createTextNode(` (${href})`)) &&
          next(el.childNodes)
        )
      },
    },
    {
      deserialize(el, next) {
        if (isElement(el) && (tagName(el) === 'td' || tagName(el) === 'th')) {
          return {
            ...DEFAULT_BLOCK,
            children: next(el.childNodes),
          }
        }

        return undefined
      },
    },
    {
      deserialize(el) {
        if (isElement(el) && tagName(el) === 'img') {
          const src = el.getAttribute('src') ?? undefined
          const alt = el.getAttribute('alt') ?? undefined

          const props = Object.fromEntries(
            Array.from(el.attributes).map((attr) => [attr.name, attr.value]),
          )

          const ancestorOfLonelyChild =
            el?.parentElement?.parentElement?.getAttribute('data-lonely-child')
          const ancestorOfListItem = el.closest('li') !== null

          if (ancestorOfLonelyChild && !ancestorOfListItem) {
            const image = options.matchers?.image?.({
              context: {
                schema,
                keyGenerator: options.keyGenerator ?? keyGenerator,
              },
              props: {
                ...props,
                ...(src ? {src} : {}),
                ...(alt ? {alt} : {}),
              },
            })

            if (image) {
              return {
                _type: '__block',
                block: image,
              }
            }
          }

          const inlineImage = options.matchers?.inlineImage?.({
            context: {
              schema,
              keyGenerator: options.keyGenerator ?? keyGenerator,
            },
            props: {
              ...props,
              ...(src ? {src} : {}),
              ...(alt ? {alt} : {}),
            },
          })

          if (inlineImage) {
            return inlineImage
          }

          const image = options.matchers?.image?.({
            context: {
              schema,
              keyGenerator: options.keyGenerator ?? keyGenerator,
            },
            props: {
              ...props,
              ...(src ? {src} : {}),
              ...(alt ? {alt} : {}),
            },
          })

          if (image) {
            return {
              _type: '__block',
              block: image,
            }
          }
        }

        return undefined
      },
    },
  ]
}
