import {BLOCK_DEFAULT_STYLE, DEFAULT_BLOCK, DEFAULT_SPAN} from '../../constants'
import {DeserializerRule} from '../../types'
import {isElement, tagName} from '../helpers'
import {spanRule} from './span'

export function createOfficeOnlineRules(): Array<DeserializerRule> {
  return [
    {
      // Headings
      deserialize(el, next) {
        if (isElement(el) && tagName(el) === 'p') {
          const role = el.getAttribute('role')
          const levelRaw = el.getAttribute('aria-level')
          const level =
            typeof levelRaw === 'string'
              ? Number.parseInt(levelRaw, 10)
              : undefined
          const style = level !== undefined ? `h${level}` : undefined

          if (role === 'heading' && style !== undefined) {
            return {
              ...DEFAULT_BLOCK,
              style,
              children: next(el.childNodes),
            }
          }
        }
      },
    },
    {
      // Lists
      deserialize(el, next) {
        if (isElement(el) && tagName(el) === 'li') {
          const ariaLevel = el.getAttribute('data-aria-level')
          const level = ariaLevel ? Number.parseInt(ariaLevel, 10) : undefined

          const parentElement = el.parentElement
          const listItem =
            parentElement && tagName(parentElement) === 'ul'
              ? 'bullet'
              : tagName(parentElement) === 'ol'
                ? 'number'
                : undefined

          if (!listItem || level === undefined) {
            return
          }

          return {
            ...DEFAULT_BLOCK,
            ...(listItem !== undefined && level !== undefined
              ? {listItem, level}
              : {}),
            children: next(el.childNodes),
            style: BLOCK_DEFAULT_STYLE,
          }
        }
      },
    },
    {
      // Spans
      deserialize(el, next, block) {
        // if (isElement(el) && tagName(el) === 'span') {
        //   console.log('span', {text:el.textContent}, el.classList.contains('EmptyTextRun'))
        // }

        if (
          isElement(el) &&
          tagName(el) === 'span' &&
          el.classList.contains('EOP')
        ) {
          // return {
          //   ...DEFAULT_SPAN,
          //   text: '',
          // }
          // console.log('span', {text: el.textContent}, el.classList.toString())
          return undefined
        }

        if (
          isElement(el) &&
          tagName(el) === 'span' &&
          el.classList.contains('TextRun')
        ) {
          const marks: Array<string> = []
          const style = el.getAttribute('style')

          if (style) {
            if (/font-style\s*:\s*italic/.test(style)) {
              marks.push('em')
            }

            if (/font-weight\s*:\s*bold/.test(style)) {
              marks.push('strong')
            }

            if (/text-decoration\s*:\s*underline/.test(style)) {
              if (tagName(el.parentNode) !== 'a') {
                marks.push('underline')
              }
            }
          }

          const text = (el.textContent ?? '').replace(/\s\s+/g, ' ')

          // console.log(text === el.textContent)

          // console.log({text})

          return {
            ...DEFAULT_SPAN,
            marks,
            text,
          }
        }

        return undefined
      },
    },
  ]
}

function isOfficeOnlineElement(element: Element) {
  return (
    element.classList.contains('TextRun') ||
    element.classList.contains('NormalTextRun')
  )
}
