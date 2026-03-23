import type {DeserializerRule} from '../../types'
import {
  BLOCK_DEFAULT_STYLE,
  DEFAULT_BLOCK,
  HTML_HEADER_TAGS,
} from '../constants'
import {isElement, tagName} from '../helpers'

/**
 * Read the list style map stored by the Word preprocessor on the document body.
 * Returns a map from list ID (e.g. "l0") to list type ("bullet" or "number").
 */
function getListStyleMap(el: Node): Record<string, string> {
  if (!isElement(el)) {
    return {}
  }

  const body = el.closest('body') || el.ownerDocument?.body
  if (!body) {
    return {}
  }

  const data = body.getAttribute('data-word-list-styles')
  if (!data) {
    return {}
  }

  try {
    return JSON.parse(data)
  } catch {
    return {}
  }
}

function getListItemStyle(el: Node): string | undefined {
  const style = isElement(el) && el.getAttribute('style')
  if (!style) {
    return undefined
  }

  // Extract list ID and level from mso-list: e.g. "mso-list:l1 level1 lfo1"
  const msoListMatch = style.match(/mso-list:\s*(l\d+)\s+(level\d+)\s+lfo\d+/)
  if (!msoListMatch) {
    return undefined
  }

  const key = `${msoListMatch[1]}:${msoListMatch[2]}`
  const listStyles = getListStyleMap(el)
  return (listStyles[key] as 'bullet' | 'number') || 'bullet'
}

function getListItemLevel(el: Node): number | undefined {
  const style = isElement(el) && el.getAttribute('style')
  if (!style) {
    return undefined
  }

  const levelMatch = style.match(/level\d+/)
  if (!levelMatch) {
    return undefined
  }

  const [level] = levelMatch[0].match(/\d/) || []
  const levelNum = level ? Number.parseInt(level, 10) : 1
  return levelNum || 1
}

function isWordListElement(el: Node): boolean {
  if (!isElement(el)) {
    return false
  }

  // Check for specific class names
  if (el.className) {
    if (
      el.className === 'MsoListParagraphCxSpFirst' ||
      el.className === 'MsoListParagraphCxSpMiddle' ||
      el.className === 'MsoListParagraphCxSpLast'
    ) {
      return true
    }
  }

  // Check for mso-list in style attribute
  const style = el.getAttribute('style')
  if (style && /mso-list:\s*l\d+\s+level\d+\s+lfo\d+/.test(style)) {
    return true
  }

  return false
}

function getHeadingStyle(el: Node): string | undefined {
  const tag = tagName(el)
  if (tag && HTML_HEADER_TAGS[tag]) {
    return HTML_HEADER_TAGS[tag]?.style
  }
  return undefined
}

export function createWordRules(): DeserializerRule[] {
  return [
    {
      deserialize(el, next) {
        const tag = tagName(el)

        // Handle list items (both paragraphs and headings)
        if (
          (tag === 'p' || HTML_HEADER_TAGS[tag || '']) &&
          isWordListElement(el)
        ) {
          const headingStyle = getHeadingStyle(el)
          return {
            ...DEFAULT_BLOCK,
            listItem: getListItemStyle(el),
            level: getListItemLevel(el),
            style: headingStyle || BLOCK_DEFAULT_STYLE,
            children: next(el.childNodes),
          }
        }
        return undefined
      },
    },
  ]
}
