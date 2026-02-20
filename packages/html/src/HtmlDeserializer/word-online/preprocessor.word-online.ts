import {isElement, tagName} from '../helpers'
import {
  hasFormatting,
  isNormalTextRun,
  isTextRunSpan,
  isWordOnlineHtml,
} from './asserters.word-online'

export function preprocessWordOnline(html: string, doc: Document): Document {
  if (!isWordOnlineHtml(html)) {
    return doc
  }

  const paragraphs = Array.from(
    doc.querySelectorAll('p.Paragraph[role="heading"]'),
  )

  for (const paragraph of paragraphs) {
    const ariaLevel = paragraph.getAttribute('aria-level')

    if (ariaLevel) {
      const wrapper = doc.createElement('word-online-block')

      wrapper.setAttribute('data-parastyle', `heading ${ariaLevel}`)

      const parent = paragraph.parentNode

      if (parent) {
        parent.insertBefore(wrapper, paragraph)

        while (paragraph.firstChild) {
          wrapper.appendChild(paragraph.firstChild)
        }

        parent.removeChild(paragraph)
      }
    }
  }

  // Group NormalTextRun spans with the same data-ccp-parastyle attribute
  // This handles cases like blockquotes, headings where multiple spans should form one block
  // Process from the body directly to handle DOM mutations
  let child = doc.body.firstChild

  while (child) {
    const next = child.nextSibling

    if (!isElement(child) || !tagName(child)?.includes('span')) {
      child = next

      continue
    }

    const paraStyle = getParaStyle(child)

    if (!paraStyle) {
      child = next

      continue
    }

    // Found a span with paragraph style - collect all consecutive siblings with same style
    const group: Element[] = [child]
    let sibling = next

    while (sibling) {
      if (!isElement(sibling) || getParaStyle(sibling) !== paraStyle) {
        break
      }

      group.push(sibling)
      sibling = sibling.nextSibling
    }

    // Wrap the spans in a container
    // Use a custom element name to avoid conflicts with HTML rules
    const wrapper = doc.createElement('word-online-block')
    wrapper.setAttribute('data-parastyle', paraStyle)

    // Insert the wrapper before the first span
    doc.body.insertBefore(wrapper, child)

    // Move all grouped spans into the wrapper
    for (const span of group) {
      wrapper.appendChild(span)
    }

    // Continue with the sibling after the last grouped span
    child = sibling
  }

  // Find all TextRun spans
  const textRunSpans = Array.from(doc.body.querySelectorAll('span')).filter(
    isTextRunSpan,
  )

  for (const textRunSpan of textRunSpans) {
    // Find ALL NormalTextRun children (Word Online can have multiple per TextRun)
    const normalTextRuns = Array.from(textRunSpan.childNodes).filter(
      isNormalTextRun,
    )

    for (const normalTextRun of normalTextRuns) {
      // Process ALL nested spans with whitespace in this NormalTextRun
      // We need to process them in a loop since removing one might affect indices
      let foundNestedSpan = true

      while (foundNestedSpan) {
        const children = Array.from(normalTextRun.childNodes)
        const nestedSpanIndex = children.findIndex(
          (node) =>
            isElement(node) &&
            tagName(node) === 'span' &&
            node.textContent.trim() === '',
        )

        if (nestedSpanIndex === -1) {
          foundNestedSpan = false
          break
        }

        const nestedSpan = children.at(nestedSpanIndex)

        if (!nestedSpan) {
          foundNestedSpan = false
          break
        }

        // Word Online uses non-breaking spaces, convert to regular spaces
        const spaceText = nestedSpan.textContent?.replace(/\u00a0/g, ' ') ?? ''

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
          const currentHasFormatting = hasFormatting(textRunSpan)

          if (
            nextSibling &&
            isElement(nextSibling) &&
            isTextRunSpan(nextSibling)
          ) {
            const nextHasFormatting = hasFormatting(nextSibling)

            // If current has formatting but next doesn't, move space to the next span
            // This makes semantic sense: "**bar** baz" or "*bar* baz" → space should be outside the formatting
            if (currentHasFormatting && !nextHasFormatting) {
              const nextNormalTextRun = Array.from(nextSibling.childNodes).find(
                isNormalTextRun,
              )

              if (nextNormalTextRun && isElement(nextNormalTextRun)) {
                // Prepend space to the first text node of the next NormalTextRun
                const firstChild = nextNormalTextRun.firstChild

                if (firstChild && firstChild.nodeType === 3) {
                  firstChild.textContent =
                    spaceText + (firstChild.textContent ?? '')
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
                  (lastTextNode.textContent ?? '') + spaceText
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
                (lastTextNode.textContent ?? '') + spaceText
            } else {
              // No text node exists, create one with the space
              const spaceNode = doc.createTextNode(spaceText)
              normalTextRun.appendChild(spaceNode)
            }
          }
        }
      }
    }
  }

  return doc
}

// Helper to get paragraph style from a span (either directly or from NormalTextRun child)
function getParaStyle(element: Element): string | undefined {
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
          (normalTextRun) =>
            normalTextRun.getAttribute('data-ccp-parastyle') === firstStyle,
        )
      ) {
        return firstStyle
      }
    }
  }

  return undefined
}
