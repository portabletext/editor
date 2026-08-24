import type {EditorSelection} from '@portabletext/editor'
import type {Path, PathSegment} from '@portabletext/patches'
import {
  COMMENT_INDICATORS,
  type StoredTextSelection,
} from './comments-anchoring'

interface SpanLike {
  _key: string
  _type: string
  text?: string
}

interface TextBlockLike {
  _key: string
  children: SpanLike[]
}

export interface SelectedTextBlock {
  node: TextBlockLike
  path: Path
}

export interface BuiltSelection {
  /**
   * The path of the array holding the selected blocks, relative to the editor.
   * Empty for blocks at the top level. Comments anchor on the containing array,
   * matching what the Studio stores.
   */
  containerPath: Path
  /** The anchor in the Studio's stored shape, ready to pass to `createComment`. */
  selection: StoredTextSelection
}

/**
 * Turns the current editor selection into the stored comment anchor.
 *
 * Per selected block, the block's entire plain text with the selection
 * boundaries marked by the two indicator characters. The write-time mirror of
 * `resolveCommentSelections`, and deliberately built the way the Studio builds
 * it so a comment written here re-anchors there and back.
 *
 * Returns `null` when there is nothing commentable: a collapsed selection,
 * no selected text, or a selection spanning blocks from different containing
 * arrays, which a single stored path cannot describe.
 */
export function buildStoredSelection(options: {
  selection: EditorSelection
  selectedBlocks: SelectedTextBlock[]
}): BuiltSelection | null {
  const {selection, selectedBlocks} = options
  if (!selection || selectedBlocks.length === 0) {
    return null
  }

  const [start, end] = selection.backward
    ? [selection.focus, selection.anchor]
    : [selection.anchor, selection.focus]

  const containerPath = selectedBlocks[0].path.slice(0, -1)
  const sharedContainer = selectedBlocks.every((selected) =>
    pathsEqual(selected.path.slice(0, -1), containerPath),
  )
  if (!sharedContainer) {
    return null
  }

  let selectedCharacters = 0
  const value = selectedBlocks.map((selected, index) => {
    const isFirst = index === 0
    const isLast = index === selectedBlocks.length - 1
    const plain = plainText(selected.node)

    const from = isFirst
      ? plainOffset(selected.node, start.path, start.offset)
      : 0
    const to = isLast
      ? plainOffset(selected.node, end.path, end.offset)
      : plain.length

    selectedCharacters += Math.max(0, to - from)

    return {
      _key: selected.node._key,
      text: `${plain.slice(0, from)}${COMMENT_INDICATORS[0]}${plain.slice(from, to)}${COMMENT_INDICATORS[1]}${plain.slice(to)}`,
    }
  })

  // A collapsed selection, or one that only touches empty text, anchors to
  // nothing worth highlighting.
  if (selectedCharacters === 0) {
    return null
  }

  return {containerPath, selection: {type: 'text', value}}
}

function plainText(block: TextBlockLike): string {
  return block.children
    .map((child) => (isSpan(child) ? (child.text ?? '') : ''))
    .join('')
}

/**
 * Converts a selection point into an offset within the block's plain text: the
 * text of every span before the point's child, plus the offset inside it. A
 * point whose child is not in this block clamps to the block edge, which is
 * where a cross-block selection boundary lands.
 */
function plainOffset(
  block: TextBlockLike,
  pointPath: Path,
  offset: number,
): number {
  const childSegment = pointPath[pointPath.length - 1]
  if (!isKeyedSegment(childSegment)) {
    return offset
  }

  let total = 0
  for (const child of block.children) {
    if (child._key === childSegment._key) {
      return total + (isSpan(child) ? offset : 0)
    }
    if (isSpan(child)) {
      total += (child.text ?? '').length
    }
  }
  return total
}

function isSpan(child: SpanLike): boolean {
  return child._type === 'span' && typeof child.text === 'string'
}

function isKeyedSegment(
  segment: PathSegment | undefined,
): segment is {_key: string} {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}

function pathsEqual(a: Path, b: Path): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every((segment, index) => {
    const other = b[index]
    if (isKeyedSegment(segment) && isKeyedSegment(other)) {
      return segment._key === other._key
    }
    return segment === other
  })
}
