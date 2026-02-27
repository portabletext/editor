import {isElement, tagName} from '../helpers'
import {
  hasFormatting,
  isNormalTextRun,
  isTextRunSpan,
  isWordOnlineHtml,
} from '../rules/word-online-asserters'

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
    // Find ALL NormalTextRun children
    const normalTextRuns = Array.from(textRunSpan.childNodes).filter(
      isNormalTextRun,
    )

    for (const normalTextRun of normalTextRuns) {
      // Process ALL nested spans with whitespace in this NormalTextRun
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
            const spaceNode = doc.createTextNode(spaceText)
            normalTextRun.insertBefore(spaceNode, normalTextRun.firstChild)
          }
        } else {
          // Space at the end - check if we should move it to the next TextRun
          const nextSibling = textRunSpan.nextSibling
          const currentHasFormatting = hasFormatting(textRunSpan)

          if (
            nextSibling &&
            isElement(nextSibling) &&
            isTextRunSpan(nextSibling)
          ) {
            const nextHasFormatting = hasFormatting(nextSibling)

            if (currentHasFormatting && !nextHasFormatting) {
              const nextNormalTextRun = Array.from(nextSibling.childNodes).find(
                isNormalTextRun,
              )

              if (nextNormalTextRun && isElement(nextNormalTextRun)) {
                const firstChild = nextNormalTextRun.firstChild

                if (firstChild && firstChild.nodeType === 3) {
                  firstChild.textContent =
                    spaceText + (firstChild.textContent ?? '')
                } else {
                  const spaceNode = doc.createTextNode(spaceText)
                  nextNormalTextRun.insertBefore(
                    spaceNode,
                    nextNormalTextRun.firstChild,
                  )
                }
              }
            } else {
              const lastTextNode = Array.from(normalTextRun.childNodes).find(
                (n) => n.nodeType === 3,
              )

              if (lastTextNode) {
                lastTextNode.textContent =
                  (lastTextNode.textContent ?? '') + spaceText
              } else {
                const spaceNode = doc.createTextNode(spaceText)
                normalTextRun.appendChild(spaceNode)
              }
            }
          } else {
            const lastTextNode = Array.from(normalTextRun.childNodes).find(
              (n) => n.nodeType === 3,
            )

            if (lastTextNode) {
              lastTextNode.textContent =
                (lastTextNode.textContent ?? '') + spaceText
            } else {
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

// Helper to get paragraph style from a span
function getParaStyle(element: Element): string | undefined {
  const directStyle = element.getAttribute('data-ccp-parastyle')

  if (directStyle) {
    return directStyle
  }

  if (tagName(element) === 'span' && element.classList.contains('TextRun')) {
    const normalTextRuns = Array.from(
      element.querySelectorAll('.NormalTextRun'),
    )

    if (normalTextRuns.length > 0) {
      const firstStyle = normalTextRuns[0].getAttribute('data-ccp-parastyle')

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
