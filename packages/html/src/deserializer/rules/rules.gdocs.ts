import type {Schema} from '@portabletext/schema'
import type {DeserializerRule} from '../../types'
import {
  BLOCK_DEFAULT_STYLE,
  DEFAULT_BLOCK,
  DEFAULT_SPAN,
  HTML_BLOCK_TAGS,
  HTML_HEADER_TAGS,
  HTML_LIST_CONTAINER_TAGS,
} from '../constants'
import {hasMonospaceFontFamily, isElement, tagName} from '../helpers'
import {keyGenerator} from '../random-key'
import type {SchemaMatchers} from '../schema-matchers'

const LIST_CONTAINER_TAGS = Object.keys(HTML_LIST_CONTAINER_TAGS)

// font-style:italic seems like the most important rule for italic / emphasis in their html
function isEmphasis(el: Node): boolean {
  const style = isElement(el) && el.getAttribute('style')
  return /font-style\s*:\s*italic/.test(style || '')
}

// font-weight:700 seems like the most important rule for bold in their html
function isStrong(el: Node): boolean {
  const style = isElement(el) && el.getAttribute('style')
  return /font-weight\s*:\s*700/.test(style || '')
}

// text-decoration seems like the most important rule for underline in their html
function isUnderline(el: Node): boolean {
  if (!isElement(el) || tagName(el.parentNode) === 'a') {
    return false
  }

  const style = isElement(el) && el.getAttribute('style')

  return /text-decoration\s*:\s*underline/.test(style || '')
}

// text-decoration seems like the most important rule for strike-through in their html
// allows for line-through regex to be more lineient to allow for other text-decoration before or after
function isStrikethrough(el: Node): boolean {
  const style = isElement(el) && el.getAttribute('style')
  return /text-decoration\s*:\s*(?:.*line-through.*;)/.test(style || '')
}

// Check for attribute given by the gdocs preprocessor
function isGoogleDocs(el: Node): boolean {
  return isElement(el) && Boolean(el.getAttribute('data-is-google-docs'))
}

function isRootNode(el: Node): boolean {
  return isElement(el) && Boolean(el.getAttribute('data-is-root-node'))
}

function getListItemStyle(el: Node): 'bullet' | 'number' | undefined {
  const parentTag = tagName(el.parentNode)
  if (parentTag && !LIST_CONTAINER_TAGS.includes(parentTag)) {
    return undefined
  }
  return tagName(el.parentNode) === 'ul' ? 'bullet' : 'number'
}

function getListItemLevel(el: Node): number {
  let level = 0
  if (tagName(el) === 'li') {
    let parentNode = el.parentNode
    while (parentNode) {
      const parentTag = tagName(parentNode)
      if (parentTag && LIST_CONTAINER_TAGS.includes(parentTag)) {
        level++
      }
      parentNode = parentNode.parentNode
    }
  } else {
    level = 1
  }
  return level
}

const blocks: Record<string, {style: string} | undefined> = {
  ...HTML_BLOCK_TAGS,
  ...HTML_HEADER_TAGS,
}

function getBlockStyle(schema: Schema, el: Node): string {
  const childTag = tagName(el.firstChild)
  const block = childTag && blocks[childTag]
  if (!block) {
    return BLOCK_DEFAULT_STYLE
  }
  if (!schema.styles.some((style) => style.name === block.style)) {
    return BLOCK_DEFAULT_STYLE
  }
  return block.style
}

/**
 * A Google Docs code block has no semantic markup: it is a run of `<p>`
 * elements (one per line) whose spans carry a monospace `font-family`. A
 * paragraph qualifies when it has at least one text-bearing span and every
 * text-bearing span is monospace.
 */
function isMonospaceParagraph(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'p') {
    return false
  }

  const spans = Array.from(el.querySelectorAll('span')).filter(
    (span) => (span.textContent ?? '').trim() !== '',
  )

  return spans.length > 0 && spans.every(hasMonospaceFontFamily)
}

/**
 * A blank line inside a Google Docs code block is a `<p>` whose monospace
 * span contains only a `<br>`, so it has no text-bearing spans and fails
 * `isMonospaceParagraph`. Treat blank paragraphs as run members when they
 * sit between monospace paragraphs.
 */
function isBlankParagraph(el: Node): boolean {
  return (
    isElement(el) && tagName(el) === 'p' && (el.textContent ?? '').trim() === ''
  )
}

/**
 * Find the nearest non-blank paragraph sibling in the given direction and
 * return it when it is a monospace paragraph.
 */
function findAdjacentMonospaceParagraph(
  el: Element,
  direction: 'previous' | 'next',
): Element | undefined {
  let sibling =
    direction === 'previous' ? el.previousElementSibling : el.nextElementSibling

  while (sibling && isBlankParagraph(sibling)) {
    sibling =
      direction === 'previous'
        ? sibling.previousElementSibling
        : sibling.nextElementSibling
  }

  return sibling && isMonospaceParagraph(sibling) ? sibling : undefined
}

export function createGDocsRules(
  schema: Schema,
  options: {keyGenerator?: () => string; matchers?: SchemaMatchers},
): DeserializerRule[] {
  const context = {
    schema,
    keyGenerator: options.keyGenerator ?? keyGenerator,
  }
  const codeMatcher = options.matchers?.code

  // Decide once whether the schema can hold a code block, so both code
  // rules can fall through without walking siblings when it cannot. The
  // probe uses a no-op key generator since only the matcher's defined /
  // undefined return is consumed; the real generator is left untouched.
  const schemaCanHoldCode =
    codeMatcher?.({
      context: {schema, keyGenerator: () => ''},
      props: {language: undefined, code: ''},
    }) !== undefined

  return [
    {
      // Runs of monospace paragraphs become a single code block object,
      // when the schema can hold one
      deserialize(el, _next, createBlock) {
        if (
          !isElement(el) ||
          !isGoogleDocs(el) ||
          !isRootNode(el) ||
          !isMonospaceParagraph(el) ||
          !schemaCanHoldCode
        ) {
          // The schema cannot hold a code block object. Fall through to the
          // regular paragraph handling, where the span rule applies the
          // `code` decorator when the schema has one.
          return undefined
        }

        // The deserializer visits every sibling, so only the first paragraph
        // of a run emits the code block; the rest are swallowed. Blank
        // paragraphs between monospace paragraphs belong to the run, so the
        // run start is the paragraph with no monospace paragraph before it.
        if (findAdjacentMonospaceParagraph(el, 'previous')) {
          return []
        }

        const lines = [el.textContent ?? '']
        let pendingBlankLines = 0
        let sibling = el.nextElementSibling
        while (sibling) {
          if (isMonospaceParagraph(sibling)) {
            // Flush blank lines only when more code follows, so trailing
            // blank paragraphs stay outside the run
            while (pendingBlankLines > 0) {
              lines.push('')
              pendingBlankLines--
            }
            lines.push(sibling.textContent ?? '')
          } else if (isBlankParagraph(sibling)) {
            pendingBlankLines++
          } else {
            break
          }
          sibling = sibling.nextElementSibling
        }

        const codeObject = codeMatcher?.({
          context,
          props: {language: undefined, code: lines.join('\n')},
        })

        if (codeObject === undefined) {
          return undefined
        }

        return createBlock(codeObject)
      },
    },
    {
      // Blank paragraphs inside a run of monospace paragraphs are part of
      // the code block emitted by the rule above; swallow them
      deserialize(el) {
        if (
          !isElement(el) ||
          !isGoogleDocs(el) ||
          !isRootNode(el) ||
          !isBlankParagraph(el) ||
          !schemaCanHoldCode
        ) {
          return undefined
        }

        return findAdjacentMonospaceParagraph(el, 'previous') &&
          findAdjacentMonospaceParagraph(el, 'next')
          ? []
          : undefined
      },
    },
    {
      deserialize(el, next) {
        if (isElement(el) && tagName(el) === 'span' && isGoogleDocs(el)) {
          if (!el.textContent) {
            if (!el.previousSibling && !el.nextSibling) {
              el.setAttribute('data-lonely-child', 'true')
            }

            return next(el.childNodes)
          }

          const span = {
            ...DEFAULT_SPAN,
            marks: [] as string[],
            text: el.textContent,
          }
          if (isStrong(el)) {
            span.marks.push('strong')
          }
          if (isUnderline(el)) {
            span.marks.push('underline')
          }
          if (isStrikethrough(el)) {
            span.marks.push('strike-through')
          }
          if (isEmphasis(el)) {
            span.marks.push('em')
          }
          if (
            hasMonospaceFontFamily(el) &&
            schema.decorators.some((decorator) => decorator.name === 'code')
          ) {
            span.marks.push('code')
          }
          return span
        }
        return undefined
      },
    },
    {
      deserialize(el, next) {
        if (tagName(el) === 'li' && isGoogleDocs(el)) {
          return {
            ...DEFAULT_BLOCK,
            listItem: getListItemStyle(el),
            level: getListItemLevel(el),
            style: getBlockStyle(schema, el),
            children: next(el.firstChild?.childNodes || []),
          }
        }
        return undefined
      },
    },
    {
      deserialize(el) {
        if (
          tagName(el) === 'br' &&
          isGoogleDocs(el) &&
          isElement(el) &&
          // The class is `Apple-interchange-newline`; compare
          // case-insensitively since `classList.contains` is case-sensitive
          Array.from(el.classList).some(
            (className) =>
              className.toLowerCase() === 'apple-interchange-newline',
          )
        ) {
          // Clipboard plumbing, not content: swallow it instead of letting
          // it fall through to the generic `br` rule as a trailing newline
          return []
        }

        // BRs inside empty paragraphs
        if (
          tagName(el) === 'br' &&
          isGoogleDocs(el) &&
          isElement(el) &&
          el?.parentNode?.textContent === ''
        ) {
          return {
            ...DEFAULT_SPAN,
            text: '',
          }
        }

        // BRs on the root
        if (
          tagName(el) === 'br' &&
          isGoogleDocs(el) &&
          isElement(el) &&
          isRootNode(el)
        ) {
          return {
            ...DEFAULT_SPAN,
            text: '',
          }
        }
        return undefined
      },
    },
  ]
}
