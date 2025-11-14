import {isElement, tagName} from '../helpers'

// Check if this is Word Online HTML
function isWordOnlineHtml(html: string): boolean {
  return (
    /class="TextRun[^"]*SCXW\d+[^"]*BCX\d+/.test(html) ||
    /class="EOP[^"]*SCXW\d+/.test(html)
  )
}

// Check if element is a Word Online TextRun span (not NormalTextRun)
function isTextRunSpan(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return (
    className.includes('TextRun') &&
    !className.includes('NormalTextRun') &&
    !className.includes('EOP')
  )
}

// Check if TextRun has bold formatting (matches the logic in word-online.ts rules)
function hasStrongFormatting(el: Element): boolean {
  const className = el.className || ''
  const style = el.getAttribute('style') || ''
  return (
    className.includes('MacChromeBold') || /font-weight\s*:\s*bold/.test(style)
  )
}

// Check if TextRun has italic formatting
function hasEmphasisFormatting(el: Element): boolean {
  const style = el.getAttribute('style') || ''
  return /font-style\s*:\s*italic/.test(style)
}

// Check if TextRun has underline formatting
function hasUnderlineFormatting(el: Element): boolean {
  const className = el.className || ''
  const style = el.getAttribute('style') || ''
  return (
    className.includes('Underlined') ||
    /text-decoration\s*:\s*underline/.test(style)
  )
}

// Check if TextRun has any formatting (bold, italic, or underline)
function hasFormatting(el: Element): boolean {
  return (
    hasStrongFormatting(el) ||
    hasEmphasisFormatting(el) ||
    hasUnderlineFormatting(el)
  )
}

// Check if element is a NormalTextRun span
function isNormalTextRunSpan(el: Node): boolean {
  if (!isElement(el) || tagName(el) !== 'span') {
    return false
  }
  const className = el.className || ''
  return className.includes('NormalTextRun')
}

export default (html: string, doc: Document): Document => {
  if (!isWordOnlineHtml(html)) {
    return doc
  }

  // Find all TextRun spans
  const textRunSpans = Array.from(doc.body.querySelectorAll('span')).filter(
    isTextRunSpan,
  )

  textRunSpans.forEach((textRunSpan) => {
    // Find the NormalTextRun child
    const normalTextRun = Array.from(textRunSpan.childNodes).find(
      isNormalTextRunSpan,
    )
    if (!normalTextRun || !isElement(normalTextRun)) {
      return
    }

    // Look for nested span with whitespace
    const children = Array.from(normalTextRun.childNodes)
    const nestedSpanIndex = children.findIndex(
      (node) =>
        isElement(node) &&
        tagName(node) === 'span' &&
        (node.textContent || '').trim() === '',
    )

    if (nestedSpanIndex !== -1 && isElement(children[nestedSpanIndex])) {
      const nestedSpan = children[nestedSpanIndex] as Element
      // Word Online uses non-breaking spaces, convert to regular spaces
      const spaceText = (nestedSpan.textContent || '').replace(/\u00a0/g, ' ')

      // Remove the nested span
      normalTextRun.removeChild(nestedSpan)

      // Check if we should move the space to the next TextRun
      // Only move if the formatting (marks) are different
      const nextSibling = textRunSpan.nextSibling
      const currentHasFormatting = hasFormatting(textRunSpan as Element)

      if (nextSibling && isTextRunSpan(nextSibling)) {
        const nextHasFormatting = hasFormatting(nextSibling as Element)

        // If current has formatting but next doesn't, move space to the next span
        // This makes semantic sense: "**bar** baz" or "*bar* baz" → space should be outside the formatting
        if (currentHasFormatting && !nextHasFormatting) {
          const nextNormalTextRun = Array.from(nextSibling.childNodes).find(
            isNormalTextRunSpan,
          )
          if (nextNormalTextRun && isElement(nextNormalTextRun)) {
            // Prepend space to the first text node of the next NormalTextRun
            const firstChild = nextNormalTextRun.firstChild
            if (firstChild && firstChild.nodeType === 3) {
              firstChild.textContent =
                spaceText + (firstChild.textContent || '')
            } else {
              // No text node, insert a new one at the beginning
              const spaceNode = doc.createTextNode(spaceText)
              nextNormalTextRun.insertBefore(
                spaceNode,
                nextNormalTextRun.firstChild,
              )
            }
          }
          // Don't add the space back to the current span - it's been moved
        } else {
          // Same formatting, keep the space in the current span
          const lastTextNode = Array.from(normalTextRun.childNodes).find(
            (n) => n.nodeType === 3,
          )
          if (lastTextNode) {
            lastTextNode.textContent =
              (lastTextNode.textContent || '') + spaceText
          } else {
            // No text node exists, create one with the space
            const spaceNode = doc.createTextNode(spaceText)
            normalTextRun.appendChild(spaceNode)
          }
        }
      } else {
        // No next TextRun, keep the space at the end of this span's text
        const lastTextNode = Array.from(normalTextRun.childNodes).find(
          (n) => n.nodeType === 3,
        )
        if (lastTextNode) {
          lastTextNode.textContent =
            (lastTextNode.textContent || '') + spaceText
        } else {
          // No text node exists, create one with the space
          const spaceNode = doc.createTextNode(spaceText)
          normalTextRun.appendChild(spaceNode)
        }
      }
    }
  })

  return doc
}
