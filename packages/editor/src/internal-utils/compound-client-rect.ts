export function getCompoundClientRect(nodes: Array<Node>): DOMRect {
  if (nodes.length === 0) {
    return new DOMRect(0, 0, 0, 0)
  }

  const elements = nodes.filter((node) => node instanceof Element)

  const firstRect = elements.at(0)?.getBoundingClientRect()

  if (!firstRect) {
    return new DOMRect(0, 0, 0, 0)
  }

  let left = firstRect.left
  let top = firstRect.top
  let right = firstRect.right
  let bottom = firstRect.bottom

  for (let i = 1; i < elements.length; i++) {
    const rect = elements[i].getBoundingClientRect()
    left = Math.min(left, rect.left)
    top = Math.min(top, rect.top)
    right = Math.max(right, rect.right)
    bottom = Math.max(bottom, rect.bottom)
  }

  return new DOMRect(left, top, right - left, bottom - top)
}
