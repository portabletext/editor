import * as Y from 'yjs'
import {Element, Text, type Node} from '../slate'

export interface YTarget {
  yParent: Y.XmlText
  textRange: {start: number; end: number}
  yTarget?: Y.XmlText
}

/**
 * Given a Slate path, navigates the Y.XmlText tree to find the
 * corresponding Y.XmlText target and its offset range within the parent.
 *
 * For a path like `[2, 1]`:
 *   - First finds the 3rd child (index 2) in the shared root
 *   - Then finds the 2nd child (index 1) within that element
 *
 * Text nodes have a Y-length equal to their text length.
 * Element nodes (embeds) have a Y-length of 1.
 */
export function getYTarget(
  sharedRoot: Y.XmlText,
  slateRoot: Node,
  path: number[],
): YTarget {
  if (path.length === 0) {
    return {
      yParent: sharedRoot,
      textRange: {start: 0, end: yTextContentLength(sharedRoot)},
      yTarget: sharedRoot,
    }
  }

  let currentYText = sharedRoot
  let currentSlateNode: Node = slateRoot

  for (let depth = 0; depth < path.length; depth++) {
    const index = path[depth]!
    const isLast = depth === path.length - 1

    if (!Element.isElement(currentSlateNode)) {
      throw new Error(
        `Cannot descend into a text node at path [${path.join(', ')}]`,
      )
    }

    const children = currentSlateNode.children

    const {offset, length} = getYOffsetAndLength(children, index)

    if (isLast) {
      const child = children[index]
      if (child && Element.isElement(child)) {
        const delta = currentYText.toDelta() as Array<{
          insert: string | Y.XmlText
        }>
        const yTarget = findEmbedAtOffset(delta, offset)
        return {
          yParent: currentYText,
          textRange: {start: offset, end: offset + length},
          yTarget,
        }
      }

      return {
        yParent: currentYText,
        textRange: {start: offset, end: offset + length},
      }
    }

    // Descend into nested element
    const delta = currentYText.toDelta() as Array<{
      insert: string | Y.XmlText
    }>
    const yTarget = findEmbedAtOffset(delta, offset)
    if (!yTarget) {
      throw new Error(
        `Expected Y.XmlText embed at offset ${offset} for path [${path.join(', ')}]`,
      )
    }

    currentYText = yTarget
    const nextSlateNode = children[index]
    if (!nextSlateNode) {
      throw new Error(
        `No child at index ${index} for path [${path.join(', ')}]`,
      )
    }
    currentSlateNode = nextSlateNode
  }

  return {
    yParent: currentYText,
    textRange: {start: 0, end: yTextContentLength(currentYText)},
    yTarget: currentYText,
  }
}

/**
 * Calculates the Y offset for a child at the given Slate index,
 * plus the Y-length of that child.
 */
function getYOffsetAndLength(
  children: Node[],
  index: number,
): {offset: number; length: number} {
  let offset = 0

  for (let i = 0; i < index; i++) {
    const child = children[i]
    if (child) {
      offset += yNodeLength(child)
    }
  }

  const child = children[index]
  const length = child ? yNodeLength(child) : 0

  return {offset, length}
}

/**
 * Returns the Y-length of a Slate node.
 * Text nodes: their text string length.
 * Element nodes (embeds): 1.
 */
function yNodeLength(node: Node): number {
  if (Text.isText(node)) {
    return node.text.length
  }
  return 1
}

/**
 * Finds the Y.XmlText embed at a given offset in a delta array.
 */
function findEmbedAtOffset(
  delta: Array<{insert: string | Y.XmlText}>,
  targetOffset: number,
): Y.XmlText | undefined {
  let offset = 0
  for (const entry of delta) {
    const length = typeof entry.insert === 'string' ? entry.insert.length : 1
    if (offset === targetOffset && entry.insert instanceof Y.XmlText) {
      return entry.insert
    }
    offset += length
    if (offset > targetOffset) {
      break
    }
  }
  return undefined
}

/**
 * Returns the total content length of a Y.XmlText (text chars + embeds).
 */
export function yTextContentLength(yText: Y.XmlText): number {
  const delta = yText.toDelta() as Array<{insert: string | Y.XmlText}>
  let length = 0
  for (const entry of delta) {
    length += typeof entry.insert === 'string' ? entry.insert.length : 1
  }
  return length
}
