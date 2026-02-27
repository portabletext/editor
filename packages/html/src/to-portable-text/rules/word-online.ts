import type {Schema} from '@portabletext/schema'
import {DEFAULT_SPAN, HTML_BLOCK_TAGS, HTML_HEADER_TAGS} from '../constants'
import type {SchemaMatchers} from '../schema-matchers'
import type {DeserializerRule} from '../types'
import {keyGenerator} from '../random-key'
import {isElement, tagName} from '../helpers'
import {
  hasEmphasisFormatting,
  hasStrikethroughFormatting,
  hasStrongFormatting,
  hasUnderlineFormatting,
  isFindHit,
  isInBlockquote,
  isInHeading,
  isNormalTextRun,
  isWordOnlineTextRun,
} from './word-online-asserters'

function mapParaStyleToBlockStyle(schema: Schema, paraStyle: string) {
  const blockStyleMap: Record<string, string> = {
    'heading 1': 'h1',
    'heading 2': 'h2',
    'heading 3': 'h3',
    'heading 4': 'h4',
    'heading 5': 'h5',
    'heading 6': 'h6',
    'Quote': 'blockquote',
  }

  const blockStyle = blockStyleMap[paraStyle] ?? 'normal'

  return schema.styles.find((style) => style.name === blockStyle)?.name
}

export function createWordOnlineRules(
  schema: Schema,
  options: {keyGenerator?: () => string; matchers?: SchemaMatchers},
): DeserializerRule[] {
  return [
    // Image rule - handles bare Word Online <img> tags with WACImage class
    {
      deserialize(el) {
        if (!isElement(el) || tagName(el) !== 'img') {
          return undefined
        }

        // Handle className which might be a string or SVGAnimatedString
        const classNameRaw = el.className
        let className = ''
        if (typeof classNameRaw === 'string') {
          className = classNameRaw
        } else if (classNameRaw && typeof classNameRaw === 'object') {
          className = (classNameRaw as {baseVal?: string}).baseVal || ''
        }

        if (!className.includes('WACImage')) {
          return undefined
        }

        const src = el.getAttribute('src') ?? undefined
        const alt = el.getAttribute('alt') ?? undefined

        const props = Object.fromEntries(
          Array.from(el.attributes).map((attr) => [attr.name, attr.value]),
        )

        const image = options.matchers?.image?.({
          context: {
            schema: schema,
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

        return undefined
      },
    },
    // Image rule - handles Word Online images wrapped in WACImageContainer
    {
      deserialize(el) {
        if (!isElement(el)) {
          return undefined
        }

        const classNameRaw = el.className
        let className = ''
        if (typeof classNameRaw === 'string') {
          className = classNameRaw
        } else if (classNameRaw && typeof classNameRaw === 'object') {
          className = (classNameRaw as {baseVal?: string}).baseVal || ''
        }
        if (!className.includes('WACImageContainer')) {
          return undefined
        }

        const img = el.querySelector('img')
        if (!img) {
          return undefined
        }

        const src = img.getAttribute('src') ?? undefined
        const alt = img.getAttribute('alt') ?? undefined

        const props = Object.fromEntries(
          Array.from(img.attributes).map((attr) => [attr.name, attr.value]),
        )

        const isInsideListItem = el.closest('li') !== null
        const isInsideParagraph = el.closest('p') !== null

        if (!isInsideParagraph || isInsideListItem) {
          const inlineImage = options.matchers?.inlineImage?.({
            context: {
              schema: schema,
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
        }

        const image = options.matchers?.image?.({
          context: {
            schema: schema,
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

        return undefined
      },
    },
    // List item rule - handles <li> elements with aria-level
    {
      deserialize(el, next) {
        if (!isElement(el) || tagName(el) !== 'li') {
          return undefined
        }

        const ariaLevel = el.getAttribute('data-aria-level')

        if (!ariaLevel) {
          return undefined
        }

        const listItem = tagName(el.parentNode) === 'ol' ? 'number' : 'bullet'

        let childNodesToProcess = el.childNodes
        let blockStyle = 'normal'

        if (
          el.childNodes.length === 1 &&
          el.firstChild &&
          isElement(el.firstChild)
        ) {
          const childTag = tagName(el.firstChild)

          if (
            childTag &&
            (HTML_BLOCK_TAGS[childTag as keyof typeof HTML_BLOCK_TAGS] ||
              HTML_HEADER_TAGS[childTag as keyof typeof HTML_HEADER_TAGS] ||
              childTag === 'word-online-block')
          ) {
            if (childTag === 'word-online-block') {
              const paraStyle = el.firstChild.getAttribute('data-parastyle')
              const foundBlockStyle = paraStyle
                ? mapParaStyleToBlockStyle(schema, paraStyle)
                : undefined

              if (foundBlockStyle) {
                blockStyle = foundBlockStyle
              }
            }

            childNodesToProcess = el.firstChild.childNodes
          }
        }

        const children = next(childNodesToProcess)
        let childArray = Array.isArray(children)
          ? children
          : [children].filter(Boolean)

        // Clean up trailing empty or whitespace-only spans
        while (childArray.length > 0) {
          const lastChild = childArray[childArray.length - 1]

          if (
            lastChild &&
            typeof lastChild === 'object' &&
            'text' in lastChild
          ) {
            const text = (lastChild.text as string).trimEnd()
            if (text === '') {
              childArray = childArray.slice(0, -1)
            } else if (text !== lastChild.text) {
              lastChild.text = text
              break
            } else {
              break
            }
          } else {
            break
          }
        }

        return {
          _type: schema.block.name,
          children: childArray,
          markDefs: [],
          style: blockStyle,
          listItem,
          level: parseInt(ariaLevel, 10),
        }
      },
    },
    // Block style rule - handles paragraph styles like Quote
    {
      deserialize(el, next) {
        if (!isElement(el)) {
          return undefined
        }

        const paraStyle = el.getAttribute('data-parastyle')
        const blockStyle = paraStyle
          ? mapParaStyleToBlockStyle(schema, paraStyle)
          : undefined

        if (!blockStyle) {
          return undefined
        }

        const children = next(el.childNodes)

        return {
          _type: schema.block.name,
          style: blockStyle,
          markDefs: [],
          children: Array.isArray(children)
            ? children
            : children
              ? [children]
              : [],
        }
      },
    },
    // TextRun rule
    {
      deserialize(el) {
        if (isWordOnlineTextRun(el)) {
          if (!isElement(el)) {
            return undefined
          }

          if (!el.textContent) {
            return undefined
          }

          const textSpans = Array.from(el.childNodes).filter(
            (node) => isNormalTextRun(node) || isFindHit(node),
          )
          const text = textSpans
            .map((span) => (isElement(span) ? (span.textContent ?? '') : ''))
            .join('')

          if (!text) {
            return undefined
          }

          const span = {
            ...DEFAULT_SPAN,
            marks: [] as Array<string>,
            text,
          }

          if (hasStrongFormatting(el)) {
            span.marks.push('strong')
          }

          if (
            hasEmphasisFormatting(el) &&
            !isInHeading(el) &&
            !isInBlockquote(el)
          ) {
            span.marks.push('em')
          }

          if (hasUnderlineFormatting(el)) {
            const isInsideLink =
              isElement(el) &&
              el.parentElement &&
              tagName(el.parentElement) === 'a'

            if (isInsideLink) {
              const linkElement = el.parentElement
              if (linkElement) {
                const prevSibling = linkElement.previousSibling
                const nextSibling = linkElement.nextSibling

                const hasPrevUnderline =
                  prevSibling &&
                  isElement(prevSibling) &&
                  hasUnderlineFormatting(prevSibling)
                const hasNextUnderline =
                  nextSibling &&
                  isElement(nextSibling) &&
                  hasUnderlineFormatting(nextSibling)

                if (hasPrevUnderline || hasNextUnderline) {
                  span.marks.push('underline')
                }
              }
            } else {
              span.marks.push('underline')
            }
          }

          if (hasStrikethroughFormatting(el)) {
            span.marks.push('strike-through')
          }

          return span
        }

        return undefined
      },
    },
  ]
}
