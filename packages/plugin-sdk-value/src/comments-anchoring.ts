import type {EditorSelection} from '@portabletext/editor'
import type {Path, PathSegment} from '@portabletext/patches'
import {
  applyPatches,
  cleanupEfficiency,
  DIFF_DELETE,
  DIFF_EQUAL,
  DIFF_INSERT,
  makeDiff,
  makePatches,
  type Diff,
  type Patch,
} from '@sanity/diff-match-patch'
import {arrayifyPath} from './plugin.sdk-value'

/**
 * How the Studio stores an inline comment's anchor: per Portable Text block the
 * selection touches, the block's entire plain text with these two private-use
 * characters inserted where the selection starts and ends. Text rather than
 * offsets, so the anchor can be re-found after the text around it changes.
 */
export const COMMENT_INDICATORS = ['\uF000', '\uF001'] as const

const COMMENT_INDICATORS_REGEX = new RegExp(
  `[${COMMENT_INDICATORS.join('')}]`,
  'g',
)

/**
 * Inserted between spans when diffing, so a plain-text offset can be mapped
 * back to the span it belongs to afterwards.
 */
const CHILD_SYMBOL = '\uF0D0'

/**
 * Kept from the Studio implementation: high enough to avoid re-anchoring onto
 * the wrong occurrence of a repeated word, low enough not to hurt.
 */
const DMP_MARGIN = 15

/**
 * The stored anchor of one inline comment, in the shape the SDK returns it.
 * Structurally `CommentTextSelection` from `@sanity/sdk`, declared here so the
 * pure modules in this package stay import-light.
 */
export interface StoredTextSelection {
  type: 'text'
  value: {_key: string; text: string}[]
}

export interface AnchoredComment {
  /** The comment's id, echoed back so the caller can correlate. */
  commentId: string
  /** Where the comment's text sits in the current editor value. */
  selection: NonNullable<EditorSelection>
}

interface ResolveOptions {
  /** The editor's current value. */
  value: unknown[]
  /**
   * Each comment's stored anchor, with its field path already reduced to the
   * path *inside* the editor: `[]` for a block directly in the decorated
   * field, or the keyed path of the containing array for a nested block.
   */
  comments: Array<{
    commentId: string
    relativePath: Path
    selection: StoredTextSelection
  }>
}

interface SpanLike {
  _key: string
  _type: string
  text?: string
}

interface TextBlockLike {
  _key: string
  children: SpanLike[]
}

function isTextBlock(node: unknown): node is TextBlockLike {
  return (
    typeof node === 'object' &&
    node !== null &&
    Array.isArray((node as TextBlockLike).children) &&
    typeof (node as TextBlockLike)._key === 'string'
  )
}

function isSpan(child: SpanLike): boolean {
  return child._type === 'span' && typeof child.text === 'string'
}

function getValueAtPath(value: unknown, path: Path): unknown {
  let current: unknown = value
  for (const segment of path) {
    if (current === null || typeof current !== 'object') {
      return undefined
    }
    if (typeof segment === 'string') {
      current = (current as Record<string, unknown>)[segment]
    } else if (typeof segment === 'number') {
      current = Array.isArray(current) ? current[segment] : undefined
    } else if (isKeyedSegment(segment)) {
      current = Array.isArray(current)
        ? current.find(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              (item as {_key?: string})._key === segment._key,
          )
        : undefined
    } else {
      return undefined
    }
  }
  return current
}

function isKeyedSegment(segment: PathSegment): segment is {_key: string} {
  return typeof segment === 'object' && segment !== null && '_key' in segment
}

function toPlainTextWithChildSeparators(block: TextBlockLike): string {
  return block.children
    .map((child) =>
      isSpan(child) ? (child.text ?? '').replaceAll(CHILD_SYMBOL, ' ') : '',
    )
    .join(CHILD_SYMBOL)
}

function diffText(
  current: string,
  next: string,
): {patches: Patch[]; levenshtein: number} {
  const diff = makeDiff(current, next)
  const diffs = cleanupEfficiency(diff)
  return {
    patches: makePatches(current, diffs, {margin: DMP_MARGIN}),
    levenshtein: diffsLevenshtein(diffs),
  }
}

function diffApply(current: string, patches: Patch[]): string {
  return applyPatches(patches, current, {
    allowExceedingIndices: true,
    margin: DMP_MARGIN,
  })[0]
}

/**
 * Finds each stored anchor in the current editor value.
 *
 * A direct port of the Studio's `buildRangeDecorationSelectionsFromComments`,
 * minus its Studio-only inputs. The stored text is diffed against the block's
 * current text, so an anchor survives edits around it and inside it up to a
 * similarity threshold. An anchor whose text is gone, or changed beyond
 * recognition, is dropped rather than drawn somewhere wrong.
 *
 * Live tracking while the user types is not this function's job: the editor's
 * `RangeDecoration.onMoved` does that. This runs when comments load or change.
 */
export function resolveCommentSelections(
  options: ResolveOptions,
): AnchoredComment[] {
  const {value, comments} = options
  const anchored: AnchoredComment[] = []

  for (const {commentId, relativePath, selection} of comments) {
    for (const selectionMember of selection.value) {
      const container =
        relativePath.length > 0 ? getValueAtPath(value, relativePath) : value
      const matchedBlock = Array.isArray(container)
        ? container.find(
            (block) =>
              isTextBlock(block) && block._key === selectionMember._key,
          )
        : undefined
      if (!matchedBlock || !isTextBlock(matchedBlock)) {
        continue
      }

      const selectionText = selectionMember.text.replaceAll(
        COMMENT_INDICATORS_REGEX,
        '',
      )
      const textWithChildSeparators =
        toPlainTextWithChildSeparators(matchedBlock)
      const {patches} = diffText(selectionText, selectionMember.text)
      const diffedText = diffApply(textWithChildSeparators, patches)
      const startIndex = diffedText.indexOf(COMMENT_INDICATORS[0])
      const endIndex = diffedText
        .replaceAll(COMMENT_INDICATORS[0], '')
        .indexOf(COMMENT_INDICATORS[1])
      const textWithoutCommentTags = diffedText.replaceAll(
        COMMENT_INDICATORS_REGEX,
        '',
      )

      if (startIndex === -1 || endIndex === -1) {
        continue
      }

      const oldCommentedText = selectionMember.text.slice(
        selectionMember.text.indexOf(COMMENT_INDICATORS[0]) + 1,
        selectionMember.text.indexOf(COMMENT_INDICATORS[1]),
      )
      const newCommentedText = textWithoutCommentTags.slice(
        startIndex,
        endIndex,
      )
      const {levenshtein} = diffText(newCommentedText, oldCommentedText)
      // Kept from the Studio, oddity included: only the *old* length is halved.
      const threshold = Math.round(
        newCommentedText.length + oldCommentedText.length / 2,
      )

      // The anchor is lost when its text is gone or no longer recognisable.
      // Better no highlight than a highlight on the wrong words.
      if (
        newCommentedText.length === 0 ||
        levenshtein > threshold ||
        startIndex + 1 === endIndex
      ) {
        continue
      }

      let childIndexAnchor = 0
      let anchorOffset = 0
      let childIndexFocus = 0
      let focusOffset = 0
      for (let i = 0; i < textWithoutCommentTags.length; i++) {
        if (textWithoutCommentTags[i] === CHILD_SYMBOL) {
          if (i <= startIndex) {
            anchorOffset = -1
            childIndexAnchor++
          }
          focusOffset = -1
          childIndexFocus++
        }
        if (i < startIndex) {
          anchorOffset++
        }
        if (i < startIndex + newCommentedText.length) {
          focusOffset++
        }
        if (i === startIndex + newCommentedText.length) {
          break
        }
      }

      anchored.push({
        commentId,
        selection: {
          anchor: {
            path: [
              ...relativePath,
              {_key: matchedBlock._key},
              'children',
              {_key: matchedBlock.children[childIndexAnchor]._key},
            ],
            offset: anchorOffset,
          },
          focus: {
            path: [
              ...relativePath,
              {_key: matchedBlock._key},
              'children',
              {_key: matchedBlock.children[childIndexFocus]._key},
            ],
            offset: focusOffset,
          },
        },
      })
    }
  }

  return anchored
}

function diffsLevenshtein(diffs: Diff[]): number {
  let levenshtein = 0
  let insertions = 0
  let deletions = 0
  for (const [op, data] of diffs) {
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length
        break
      case DIFF_DELETE:
        deletions += data.length
        break
      case DIFF_EQUAL:
        // A deletion and an insertion together count as one substitution.
        levenshtein += Math.max(insertions, deletions)
        insertions = 0
        deletions = 0
        break
      default:
        break
    }
  }
  levenshtein += Math.max(insertions, deletions)
  return levenshtein
}

/**
 * Reduces a comment's stored field path to a path inside this editor.
 *
 * `undefined` means the comment belongs to some other editor: a different
 * field, a sibling container, or a stored path that does not parse. Skipping
 * those is what lets several editors on one document each decorate only their
 * own comments.
 */
export function relativeCommentPath(
  basePath: Path,
  fieldPath: string,
): Path | undefined {
  let parsed: Path
  try {
    parsed = arrayifyPath(fieldPath)
  } catch {
    return undefined
  }
  if (parsed.length < basePath.length) {
    return undefined
  }
  for (let i = 0; i < basePath.length; i++) {
    if (!segmentsEqual(basePath[i], parsed[i])) {
      return undefined
    }
  }
  return parsed.slice(basePath.length)
}

function segmentsEqual(a: PathSegment, b: PathSegment): boolean {
  if (isKeyedSegment(a) && isKeyedSegment(b)) {
    return a._key === b._key
  }
  return a === b
}
