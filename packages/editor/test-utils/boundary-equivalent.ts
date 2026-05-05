import {isSpan} from '@portabletext/schema'
import type {EditorSchema} from '../src/editor/editor-schema'
import {getSibling} from '../src/node-traversal/get-sibling'
import {getSpanNode} from '../src/node-traversal/get-span-node'
import type {Containers} from '../src/schema/resolve-containers'
import type {Node} from '../src/slate/interfaces/node'
import type {EditorSelection, EditorSelectionPoint} from '../src/types/editor'
import {isEqualSelectionPoints} from '../src/utils/util.is-equal-selection-points'

type Context = {
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  }
  blockIndexMap: Map<string, number>
}

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
 * Container-aware via the traversal utilities.
 */
export function boundaryEquivalentSelections(
  context: Context,
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
  context: Context,
  point: EditorSelectionPoint,
): Array<EditorSelectionPoint> {
  const span = getSpanNode(context, point.path)

  if (!span) {
    return [point]
  }

  const variants: Array<EditorSelectionPoint> = [point]

  if (point.offset === 0) {
    const previous = getSibling(context, span.path, 'previous')
    if (previous && isSpan({schema: context.context.schema}, previous.node)) {
      variants.push({path: previous.path, offset: previous.node.text.length})
    }
  }

  if (point.offset === span.node.text.length) {
    const next = getSibling(context, span.path, 'next')
    if (next && isSpan({schema: context.context.schema}, next.node)) {
      variants.push({path: next.path, offset: 0})
    }
  }

  return variants
}
