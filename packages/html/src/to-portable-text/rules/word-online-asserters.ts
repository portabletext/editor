import {isElement, tagName} from '../helpers'

export function isWordOnlineHtml(html: string): boolean {
  return (
    /class="(?:TextRun|NormalTextRun)[^"]*SCXW\d+[^"]*BCX\d+/.test(html) ||
    /class="EOP[^"]*SCXW\d+/.test(html)
  )
}

export function isWordOnlineTextRun(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }

  return el.classList.contains('TextRun') && !el.classList.contains('EOP')
}

/**
 * Identifies the inner text holder spans in Word Online's nested structure.
 * Word Online uses: <span class="TextRun"><span class="NormalTextRun">text</span></span>
 * This function matches the inner span where actual text content lives.
 */
export function isNormalTextRun(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }

  return el.classList.contains('NormalTextRun')
}

/**
 * Identifies the outer container spans in Word Online's nested structure.
 * Word Online uses: <span class="TextRun"><span class="NormalTextRun">text</span></span>
 * This function matches the outer span that holds formatting and contains NormalTextRun children.
 */
export function isTextRunSpan(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }

  return (
    el.classList.contains('TextRun') &&
    !el.classList.contains('NormalTextRun') &&
    !el.classList.contains('EOP')
  )
}

export function isEmptyOutlineElement(el: Element): boolean {
  if (!isElement(el)) {
    return false
  }

  if (!el.classList.contains('OutlineElement')) {
    return false
  }

  return el.textContent.trim() === ''
}

export function isFindHit(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }

  return el.classList.contains('FindHit')
}

export function isInHeading(el: Node): boolean {
  let current: Node | null = el

  while (current) {
    if (isElement(current)) {
      if (
        tagName(current) === 'word-online-block' &&
        /^heading \d$/.test(current.getAttribute('data-parastyle') ?? '')
      ) {
        return true
      }
    }

    current = current.parentNode
  }

  return false
}

export function isInBlockquote(el: Node): boolean {
  let current: Node | null = el

  while (current) {
    if (isElement(current)) {
      if (
        tagName(current) === 'word-online-block' &&
        current.getAttribute('data-parastyle') === 'Quote'
      ) {
        return true
      }
    }

    current = current.parentNode
  }

  return false
}

/**********************
 * Formatting asserters
 **********************/

export function hasStrongFormatting(el: Element): boolean {
  const style = el.getAttribute('style') ?? ''

  return (
    el.classList.contains('MacChromeBold') ||
    /font-weight\s*:\s*bold/.test(style)
  )
}

export function hasEmphasisFormatting(el: Element): boolean {
  const style = el.getAttribute('style') ?? ''

  return /font-style\s*:\s*italic/.test(style)
}

export function hasUnderlineFormatting(el: Element): boolean {
  const style = el.getAttribute('style') ?? ''

  return (
    el.classList.contains('Underlined') ||
    /text-decoration\s*:\s*underline/.test(style)
  )
}

export function hasStrikethroughFormatting(el: Element): boolean {
  const style = el.getAttribute('style') ?? ''

  return (
    el.classList.contains('Strikethrough') ||
    /text-decoration\s*:\s*line-through/.test(style)
  )
}

export function hasFormatting(el: Element): boolean {
  return (
    hasStrongFormatting(el) ||
    hasEmphasisFormatting(el) ||
    hasUnderlineFormatting(el) ||
    hasStrikethroughFormatting(el)
  )
}
