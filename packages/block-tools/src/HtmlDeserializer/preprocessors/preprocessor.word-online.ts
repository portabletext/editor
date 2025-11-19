import type {HtmlPreprocessorOptions} from '../../types'
import {
  isElement,
  normalizeWhitespace,
  removeAllWhitespace,
  tagName,
} from '../helpers'

// Check if this is Word Online HTML
function isWordOnlineHtml(html: string): boolean {
  return (
    /class="(?:TextRun|NormalTextRun)[^"]*SCXW\d+[^"]*BCX\d+/.test(html) ||
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

// Check if an OutlineElement div contains only empty content
function isEmptyOutlineElement(el: Element): boolean {
  if (!isElement(el)) {
    return false
  }
  const className = el.className || ''
  if (!className.includes('OutlineElement')) {
    return false
  }
  // Check if it contains only whitespace
  const textContent = el.textContent || ''
  return textContent.trim() === ''
}

// Normalize whitespace for Word Online's nested structure
function normalizeWordOnlineWhitespace(rootNode: Node) {
  let removedCount = 0

  // Run multiple passes until no more nodes are removed
  do {
    removedCount = 0
    const nodesToRemove: Element[] = []
    let consecutiveEmptyCount = 0

    // Find all children (including nested ones for comprehensive handling)
    const children = Array.from(rootNode.childNodes).filter(isElement)

    for (const child of children) {
      const isEmpty =
        isEmptyOutlineElement(child) ||
        (isElement(child) && (child.textContent || '').trim() === '')

      if (isEmpty) {
        consecutiveEmptyCount++
        // Keep the first empty block, remove subsequent ones
        if (consecutiveEmptyCount > 1) {
          nodesToRemove.push(child)
        }
      } else {
        // Recursively process non-empty child nodes
        normalizeWordOnlineWhitespace(child)
        // Reset counter when we hit non-empty content
        consecutiveEmptyCount = 0
      }
    }

    // Remove the marked nodes
    nodesToRemove.forEach((node) => {
      node.parentElement?.removeChild(node)
      removedCount++
    })
  } while (removedCount > 0)
}

export function preprocessWordOnline(
  html: string,
  doc: Document,
  options: HtmlPreprocessorOptions,
): Document {
  if (!isWordOnlineHtml(html)) {
    return doc
  }

  const whitespaceOnPasteMode =
    options?.unstable_whitespaceOnPasteMode || 'preserve'

  // Handle paragraph elements with heading roles or special styles
  // These are typically wrapped in <div class="OutlineElement"> or appear as <p role="heading">
  const paragraphs = Array.from(
    doc.querySelectorAll('p.Paragraph[role="heading"]'),
  )
  paragraphs.forEach((p) => {
    const ariaLevel = p.getAttribute('aria-level')
    if (ariaLevel) {
      const wrapper = doc.createElement('word-online-block')
      wrapper.setAttribute('data-parastyle', `heading ${ariaLevel}`)

      // Replace the paragraph with the wrapper, moving the paragraph's children into it
      const parent = p.parentNode
      if (parent) {
        parent.insertBefore(wrapper, p)
        // Move all children from p to wrapper
        while (p.firstChild) {
          wrapper.appendChild(p.firstChild)
        }
        parent.removeChild(p)
      }
    }
  })

  // Helper to get paragraph style from a span (either directly or from NormalTextRun child)
  const getParaStyle = (element: Element): string | null => {
    // Check direct attribute first
    const directStyle = element.getAttribute('data-ccp-parastyle')
    if (directStyle) {
      return directStyle
    }
    // Check if it's a TextRun with NormalTextRun children that have the attribute
    if (tagName(element) === 'span' && element.classList.contains('TextRun')) {
      const normalTextRuns = Array.from(
        element.querySelectorAll('.NormalTextRun'),
      )
      if (normalTextRuns.length > 0) {
        const firstStyle = normalTextRuns[0].getAttribute('data-ccp-parastyle')
        // Verify all NormalTextRuns have the same style
        if (
          firstStyle &&
          normalTextRuns.every(
            (ntr) => ntr.getAttribute('data-ccp-parastyle') === firstStyle,
          )
        ) {
          return firstStyle
        }
      }
    }
    return null
  }

  // Group NormalTextRun spans with the same data-ccp-parastyle attribute
  // This handles cases like blockquotes, headings where multiple spans should form one block
  // Process from the body directly to handle DOM mutations
  let child = doc.body.firstChild
  while (child) {
    const next = child.nextSibling // Save next before we potentially move child

    if (!isElement(child) || !tagName(child)?.includes('span')) {
      child = next
      continue
    }

    const paraStyle = getParaStyle(child as Element)
    if (!paraStyle) {
      child = next
      continue
    }

    // Found a span with paragraph style - collect all consecutive siblings with same style
    const group: Element[] = [child as Element]
    let sibling = next
    while (sibling) {
      if (
        !isElement(sibling) ||
        getParaStyle(sibling as Element) !== paraStyle
      ) {
        break
      }
      group.push(sibling as Element)
      sibling = sibling.nextSibling
    }

    // Wrap the spans in a container
    // Use a custom element name to avoid conflicts with HTML rules
    const wrapper = doc.createElement('word-online-block')
    wrapper.setAttribute('data-parastyle', paraStyle)

    // Insert the wrapper before the first span
    doc.body.insertBefore(wrapper, child)

    // Move all grouped spans into the wrapper
    group.forEach((span) => {
      wrapper.appendChild(span)
    })

    // Continue with the sibling after the last grouped span
    child = sibling
  }

  // Find all TextRun spans
  const textRunSpans = Array.from(doc.body.querySelectorAll('span')).filter(
    isTextRunSpan,
  )

  textRunSpans.forEach((textRunSpan) => {
    // Find ALL NormalTextRun children (Word Online can have multiple per TextRun)
    const normalTextRuns = Array.from(textRunSpan.childNodes).filter(
      isNormalTextRunSpan,
    )

    normalTextRuns.forEach((normalTextRun) => {
      if (!isElement(normalTextRun)) {
        return
      }

      // Process ALL nested spans with whitespace in this NormalTextRun
      // We need to process them in a loop since removing one might affect indices
      let foundNestedSpan = true
      while (foundNestedSpan) {
        const children = Array.from(normalTextRun.childNodes)
        const nestedSpanIndex = children.findIndex(
          (node) =>
            isElement(node) &&
            tagName(node) === 'span' &&
            (node.textContent || '').trim() === '',
        )

        if (nestedSpanIndex === -1) {
          foundNestedSpan = false
          break
        }

        const nestedSpan = children[nestedSpanIndex] as Element
        // Word Online uses non-breaking spaces, convert to regular spaces
        const spaceText = (nestedSpan.textContent || '').replace(/\u00a0/g, ' ')

        // Determine if the space is at the beginning or end BEFORE removing it
        // Check if there are any text nodes before this position
        const hasTextBefore = children
          .slice(0, nestedSpanIndex)
          .some((n) => n.nodeType === 3)
        const isSpaceAtBeginning = !hasTextBefore

        // Remove the nested span
        normalTextRun.removeChild(nestedSpan)

        if (isSpaceAtBeginning) {
          // Space at the beginning - keep it at the beginning
          const firstTextNode = Array.from(normalTextRun.childNodes).find(
            (n) => n.nodeType === 3,
          )
          if (firstTextNode) {
            firstTextNode.textContent =
              spaceText + (firstTextNode.textContent || '')
          } else {
            // No text node exists, create one with the space
            const spaceNode = doc.createTextNode(spaceText)
            normalTextRun.insertBefore(spaceNode, normalTextRun.firstChild)
          }
        } else {
          // Space at the end - check if we should move it to the next TextRun
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
      }
    })
  })

  // Apply whitespace normalization based on mode
  switch (whitespaceOnPasteMode) {
    case 'normalize':
      // Word Online specific: Remove consecutive empty OutlineElement divs
      normalizeWordOnlineWhitespace(doc.body)
      break
    case 'remove':
      // Remove all whitespace nodes
      removeAllWhitespace(doc.body)
      break
    default:
      break
  }

  return doc
}
