import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../src/editor/editor-snapshot'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'
import {isEqualSelectionPoints} from '../src/utils/util.is-equal-selection-points'

/**
 * Two selection points are visually equivalent at a span boundary:
 * `{span-A, offset: span-A.text.length}` and `{span-B, offset: 0}`
 * where span-B is the next sibling span. They render to the same caret
 * position but the editor model picks one. `userEvent.type` can leave
 * the editor at either form depending on the browser, particularly when
 * native beforeinput insertion is used at a span boundary.
 *
 * Given a selection, return any boundary-equivalent selections. The
 * original selection is not included.
 *
 * Only handles top-level text-block paths (length 3). Containers and
 * deeper paths are out of scope until a concrete need shows up.
 */
export function boundaryEquivalentSelections(
  context: Pick<EditorContext, 'schema' | 'value'>,
  selection: EditorSelection,
): Array<NonNullable<EditorSelection>> {
  if (!selection) {
    return []
  }

  const anchorVariants = pointVariants(context, selection.anchor)
  const collapsed = isEqualSelectionPoints(selection.anchor, selection.focus)
  const focusVariants = collapsed
    ? null
    : pointVariants(context, selection.focus)

  const variants: Array<NonNullable<EditorSelection>> = []

  if (focusVariants === null) {
    for (const anchor of anchorVariants) {
      variants.push({anchor, focus: anchor, backward: selection.backward})
    }
  } else {
    for (const anchor of anchorVariants) {
      for (const focus of focusVariants) {
        variants.push({anchor, focus, backward: selection.backward})
      }
    }
  }

  return variants.filter(
    (variant) =>
      !(
        isEqualSelectionPoints(variant.anchor, selection.anchor) &&
        isEqualSelectionPoints(variant.focus, selection.focus)
      ),
  )
}

function pointVariants(
  context: Pick<EditorContext, 'schema' | 'value'>,
  point: EditorSelectionPoint,
): Array<EditorSelectionPoint> {
  const variants: Array<EditorSelectionPoint> = [point]

  if (point.path.length !== 3) {
    return variants
  }

  const blockSegment = point.path[0]
  const childrenSegment = point.path[1]
  const childSegment = point.path[2]

  if (
    typeof blockSegment !== 'object' ||
    blockSegment === null ||
    !('_key' in blockSegment) ||
    childrenSegment !== 'children' ||
    typeof childSegment !== 'object' ||
    childSegment === null ||
    !('_key' in childSegment)
  ) {
    return variants
  }

  const block = context.value.find(
    (b): b is typeof b & {_key: string} =>
      typeof b === 'object' &&
      b !== null &&
      '_key' in b &&
      b._key === blockSegment._key,
  )

  if (!block || !isTextBlock(context, block)) {
    return variants
  }

  const childIndex = block.children.findIndex(
    (c) => c._key === childSegment._key,
  )

  if (childIndex === -1) {
    return variants
  }

  const child = block.children[childIndex]

  if (!child || !isSpan(context, child)) {
    return variants
  }

  if (point.offset === 0 && childIndex > 0) {
    const prev = block.children[childIndex - 1]
    if (prev && isSpan(context, prev)) {
      variants.push({
        path: [{_key: block._key}, 'children', {_key: prev._key}],
        offset: prev.text.length,
      })
    }
  }

  if (
    point.offset === child.text.length &&
    childIndex < block.children.length - 1
  ) {
    const next = block.children[childIndex + 1]
    if (next && isSpan(context, next)) {
      variants.push({
        path: [{_key: block._key}, 'children', {_key: next._key}],
        offset: 0,
      })
    }
  }

  return variants
}
