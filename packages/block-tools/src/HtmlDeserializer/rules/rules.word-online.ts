import type {Schema} from '@portabletext/schema'
import {DEFAULT_SPAN, HTML_BLOCK_TAGS, HTML_HEADER_TAGS} from '../../constants'
import type {SchemaMatchers} from '../../schema-matchers'
import type {DeserializerRule} from '../../types'
import {keyGenerator} from '../../util/randomKey'
import {isElement, tagName} from '../helpers'

// Check if element is a Word Online text span
function isWordOnlineTextRun(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return className.includes('TextRun') && !className.includes('EOP')
}

// Check if element has bold formatting
function isStrong(el: Node): boolean {
  if (!isElement(el)) {
    return false
  }
  const className = el.className || ''
  const style = el.getAttribute('style') || ''
  return (
    className.includes('MacChromeBold') || /font-weight\s*:\s*bold/.test(style)
  )
}

// Check if element or its ancestors are part of a heading
function isInHeading(el: Node): boolean {
  let current: Node | null = el
  while (current) {
    if (isElement(current)) {
      // Check for the wrapped heading (created by preprocessor)
      if (
        tagName(current) === 'word-online-block' &&
        /^heading \d$/.test(current.getAttribute('data-parastyle') || '')
      ) {
        return true
      }
      // Also check for original data-ccp-parastyle in case not yet preprocessed
      const paraStyle = current.getAttribute('data-ccp-parastyle')
      if (paraStyle && /^heading \d$/.test(paraStyle)) {
        return true
      }
    }
    current = current.parentNode
  }
  return false
}

// Check if element or its ancestors are part of a blockquote
function isInBlockquote(el: Node): boolean {
  let current: Node | null = el
  while (current) {
    if (isElement(current)) {
      // Check for the wrapped blockquote (created by preprocessor)
      if (
        tagName(current) === 'word-online-block' &&
        current.getAttribute('data-parastyle') === 'Quote'
      ) {
        return true
      }
      // Also check for original data-ccp-parastyle in case not yet preprocessed
      const paraStyle = current.getAttribute('data-ccp-parastyle')
      if (paraStyle === 'Quote') {
        return true
      }
    }
    current = current.parentNode
  }
  return false
}

// Check if element has italic formatting
function isEmphasis(el: Node): boolean {
  if (!isElement(el)) {
    return false
  }
  const style = el.getAttribute('style') || ''
  return /font-style\s*:\s*italic/.test(style)
}

// Check if element has underline formatting
function isUnderline(el: Node): boolean {
  if (!isElement(el)) {
    return false
  }
  const className = el.className || ''
  const style = el.getAttribute('style') || ''
  return (
    className.includes('Underlined') ||
    /text-decoration\s*:\s*underline/.test(style)
  )
}

// Check if element has strikethrough formatting
function isStrikethrough(el: Node): boolean {
  if (!isElement(el)) {
    return false
  }
  const className = el.className || ''
  const style = el.getAttribute('style') || ''
  return (
    className.includes('Strikethrough') ||
    /text-decoration\s*:\s*line-through/.test(style)
  )
}

// Check if element is a NormalTextRun (contains the actual text)
function isNormalTextRun(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return className.includes('NormalTextRun')
}

// Check if element is a FindHit span (search result highlighting)
function isFindHit(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return className.includes('FindHit')
}

// Extract text from NormalTextRun (preprocessor already moved nested space spans out)
// Convert any remaining non-breaking spaces to regular spaces
function extractTextFromNormalTextRun(el: Element): string {
  return (el.textContent || '').replace(/\u00a0/g, ' ')
}

export function createWordOnlineRules(
  _schema: Schema,
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
          // SVGAnimatedString has baseVal property
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

        // Bare <img> tags are typically block-level, not inline
        // They should be returned as block images
        const image = options.matchers?.image?.({
          context: {
            schema: _schema,
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

        // Handle className which might be a string or SVGAnimatedString
        const classNameRaw = el.className
        let className = ''
        if (typeof classNameRaw === 'string') {
          className = classNameRaw
        } else if (classNameRaw && typeof classNameRaw === 'object') {
          // SVGAnimatedString has baseVal property
          className = (classNameRaw as {baseVal?: string}).baseVal || ''
        }
        if (!className.includes('WACImageContainer')) {
          return undefined
        }

        // Find the img element inside
        const img = el.querySelector('img')
        if (!img) {
          return undefined
        }

        const src = img.getAttribute('src') ?? undefined
        const alt = img.getAttribute('alt') ?? undefined

        const props = Object.fromEntries(
          Array.from(img.attributes).map((attr) => [attr.name, attr.value]),
        )

        // Determine if this should be an inline or block-level image
        // Word Online inline images:
        // 1. Siblings of TextRun spans (not wrapped in paragraphs)
        // 2. Inside list items (should be inline relative to the list item)
        const isInsideListItem = el.closest('li') !== null
        const isInsideParagraph = el.closest('p') !== null

        if (!isInsideParagraph || isInsideListItem) {
          // Inline image (either not in a paragraph, or inside a list item)
          const inlineImage = options.matchers?.inlineImage?.({
            context: {
              schema: _schema,
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

        // Block-level image (or fallback if inline image not supported)
        const image = options.matchers?.image?.({
          context: {
            schema: _schema,
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

        // Determine list type from parent element
        const parent = el.parentNode
        let listItem = 'bullet'
        if (parent && isElement(parent)) {
          if (tagName(parent) === 'ol') {
            listItem = 'number'
          }
        }

        // Process children to get the content
        // Match GDocs behavior: if there's a single block-level child (like h2, p, word-online-block, etc.),
        // go directly to its children to avoid nesting and preserve list item style
        let childNodesToProcess = el.childNodes
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
            // Skip the block wrapper and process its children directly
            childNodesToProcess = el.firstChild.childNodes
          }
        }

        const children = next(childNodesToProcess)
        let childArray = Array.isArray(children)
          ? children
          : [children].filter(Boolean)

        // Clean up trailing empty or whitespace-only spans
        // Word Online often adds trailing tabs/breaks and extra spaces in list items
        while (childArray.length > 0) {
          const lastChild = childArray[childArray.length - 1]
          if (
            lastChild &&
            typeof lastChild === 'object' &&
            'text' in lastChild
          ) {
            const text = (lastChild.text as string).trimEnd()
            if (text === '') {
              // Remove empty span
              childArray = childArray.slice(0, -1)
            } else if (text !== lastChild.text) {
              // Update with trimmed text
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
          _type: 'block',
          style: 'normal',
          listItem,
          level: parseInt(ariaLevel, 10),
          markDefs: [],
          children: childArray,
        }
      },
    },
    // Block style rule - handles paragraph styles like Quote
    // The preprocessor wraps grouped NormalTextRun spans in a word-online-block element
    {
      deserialize(el, next) {
        // Check if this is a wrapper element created by the preprocessor
        if (!isElement(el) || tagName(el) !== 'word-online-block') {
          return undefined
        }

        const paraStyle = el.getAttribute('data-parastyle')
        if (!paraStyle) {
          return undefined
        }

        // Map Word Online paragraph styles to Portable Text block styles
        let blockStyle = 'normal'
        if (paraStyle === 'Quote') {
          blockStyle = 'blockquote'
        } else if (paraStyle === 'heading 1') {
          blockStyle = 'h1'
        } else if (paraStyle === 'heading 2') {
          blockStyle = 'h2'
        } else if (paraStyle === 'heading 3') {
          blockStyle = 'h3'
        } else if (paraStyle === 'heading 4') {
          blockStyle = 'h4'
        } else if (paraStyle === 'heading 5') {
          blockStyle = 'h5'
        } else if (paraStyle === 'heading 6') {
          blockStyle = 'h6'
        }

        // Check if the block style is supported by the schema (matching GDocs/HTML behavior)
        // If style is not supported, return undefined to let it fall through to other rules
        if (
          blockStyle !== 'normal' &&
          !_schema.styles.some((style) => style.name === blockStyle)
        ) {
          return undefined
        }

        // Only create a block if it's not the default style
        if (blockStyle === 'normal') {
          return undefined
        }

        // Process children to get the spans
        const children = next(el.childNodes)

        // Return a block with the appropriate style
        return {
          _type: 'block',
          style: blockStyle,
          markDefs: [],
          children: Array.isArray(children)
            ? children
            : [children].filter(Boolean),
        }
      },
    },
    // Link rule - must come before TextRun rule to handle links first
    {
      deserialize(el, next) {
        if (tagName(el) !== 'a') {
          return undefined
        }

        // Check if this is a Word Online hyperlink
        const className = isElement(el) ? el.className || '' : ''
        if (!className.includes('Hyperlink')) {
          return undefined
        }

        const href = isElement(el) && el.getAttribute('href')
        if (!href) {
          return next(el.childNodes)
        }

        // Create link annotation
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
      },
    },
    // TextRun rule
    {
      deserialize(el) {
        if (isWordOnlineTextRun(el)) {
          if (!el.textContent) {
            return undefined
          }

          // Find ALL NormalTextRun and FindHit children and extract text from them
          // (Word Online sometimes splits text across multiple spans)
          // FindHit is used for search result highlighting
          let text = ''
          if (isElement(el)) {
            const textSpans = Array.from(el.childNodes).filter(
              (node) => isNormalTextRun(node) || isFindHit(node),
            )
            text = textSpans
              .map((span) =>
                isElement(span) ? extractTextFromNormalTextRun(span) : '',
              )
              .join('')
          }

          if (!text) {
            return undefined
          }

          const span = {
            ...DEFAULT_SPAN,
            marks: [] as string[],
            text,
          }

          if (isStrong(el)) {
            span.marks.push('strong')
          }

          // Don't add italic mark if we're in a heading or blockquote (it's part of their default style)
          if (isEmphasis(el) && !isInHeading(el) && !isInBlockquote(el)) {
            span.marks.push('em')
          }

          // Add underline mark if the element has explicit underline formatting
          // Word Online always adds underline to links, so we need to distinguish between:
          // 1. Default link underline (skip)
          // 2. Explicit user underline that includes the link (add)
          // We check: if the link is surrounded by underlined content, it's explicit user underline
          if (isUnderline(el)) {
            const isInsideLink =
              isElement(el) &&
              el.parentElement &&
              tagName(el.parentElement) === 'a'

            if (isInsideLink) {
              // Check if there are underlined siblings of the link
              const linkElement = el.parentElement
              if (linkElement) {
                const prevSibling = linkElement.previousSibling
                const nextSibling = linkElement.nextSibling

                // If either sibling is an underlined TextRun, the link is part of explicit underline
                const hasPrevUnderline = prevSibling && isUnderline(prevSibling)
                const hasNextUnderline = nextSibling && isUnderline(nextSibling)

                if (hasPrevUnderline || hasNextUnderline) {
                  span.marks.push('underline')
                }
                // Otherwise, it's just default link styling, don't add underline mark
              }
            } else {
              // Not in a link, always add underline
              span.marks.push('underline')
            }
          }

          // Add strikethrough mark if the element has strikethrough formatting
          if (isStrikethrough(el)) {
            span.marks.push('strike-through')
          }

          return span
        }
        return undefined
      },
    },
  ]
}
