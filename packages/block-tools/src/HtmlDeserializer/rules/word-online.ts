import {DEFAULT_SPAN} from '../../constants'
import type {DeserializerRule} from '../../types'
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

// Check if element is a NormalTextRun (contains the actual text)
function isNormalTextRun(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return className.includes('NormalTextRun')
}

// Extract text from NormalTextRun (preprocessor already moved nested space spans out)
// Convert any remaining non-breaking spaces to regular spaces
function extractTextFromNormalTextRun(el: Element): string {
  return (el.textContent || '').replace(/\u00a0/g, ' ')
}

export function createWordOnlineRules(): DeserializerRule[] {
  return [
    {
      deserialize(el) {
        if (isWordOnlineTextRun(el)) {
          if (!el.textContent) {
            return undefined
          }

          // Find ALL NormalTextRun children and extract text from them
          // (Word Online sometimes splits text across multiple NormalTextRun spans)
          let text = ''
          if (isElement(el)) {
            const normalTextRuns = Array.from(el.childNodes).filter(
              isNormalTextRun,
            )
            text = normalTextRuns
              .map((ntr) =>
                isElement(ntr) ? extractTextFromNormalTextRun(ntr) : '',
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

          if (isEmphasis(el)) {
            span.marks.push('em')
          }

          if (isUnderline(el)) {
            span.marks.push('underline')
          }

          return span
        }
        return undefined
      },
    },
  ]
}
