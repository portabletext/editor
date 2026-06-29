export type BlockTextSnapshot = {
  _key: string
  text: string
  isTextBlock: boolean
}

/**
 * Reads text content from the editor DOM for change detection.
 *
 * This is intentionally minimal and only extracts block keys and their
 * concatenated text content. Everything else (styles, marks, list items)
 * lives in the model and doesn't need DOM parsing.
 */
export function readBlockTexts(rootElement: HTMLElement): BlockTextSnapshot[] {
  const snapshots: BlockTextSnapshot[] = []

  // Iterates direct children only and assumes a flat block structure.
  // For container support, this would need to walk the DOM recursively.
  for (const child of rootElement.children) {
    if (!(child instanceof HTMLElement)) {
      continue
    }

    const key = child.getAttribute('data-block-key')
    if (!key) {
      continue
    }

    const blockType = child.getAttribute('data-block-type')
    if (blockType === 'object') {
      snapshots.push({_key: key, text: '', isTextBlock: false})
      continue
    }

    snapshots.push({_key: key, text: readBlockText(child), isTextBlock: true})
  }

  return snapshots
}

function readBlockText(blockElement: HTMLElement): string {
  const leaves = blockElement.querySelectorAll('[data-slate-leaf]')
  let text = ''

  for (const leaf of leaves) {
    if (!(leaf instanceof HTMLElement)) {
      continue
    }
    text += extractLeafText(leaf)
  }

  return text
}

function extractLeafText(leafElement: HTMLElement): string {
  const stringElement = leafElement.querySelector('[data-slate-string]')
  if (stringElement) {
    const text = stringElement.textContent ?? ''
    // Rendering appends a trailing '\n' spacer so the browser doesn't collapse
    // trailing newlines. We strip that extra newline here.
    if (text.endsWith('\n\n')) {
      return text.slice(0, -1)
    }
    return text
  }

  // During IME, the browser sometimes types into a zero-width element
  // instead of a regular string element.
  const zeroWidthElement = leafElement.querySelector('[data-slate-zero-width]')
  if (zeroWidthElement) {
    const rawText = (zeroWidthElement.textContent ?? '').replace(/\uFEFF/g, '')
    if (rawText.length > 0) {
      return rawText
    }
    return ''
  }

  const rawText = leafElement.textContent ?? ''
  return rawText.replace(/\uFEFF/g, '')
}
