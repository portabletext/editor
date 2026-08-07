import {isTextBlock} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import {isEditableContainer} from '../schema/is-editable-container'
import {getAncestors} from '../traversal/get-ancestors'
import {getNodes} from '../traversal/get-nodes'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'

export type SelectionState = {
  /**
   * Serialized path of the focused leaf (span, inline object, or block
   * object). Set when the selection is collapsed and resolves to a leaf.
   */
  focusedLeafPath: string | undefined
  /**
   * Set of serialized paths of leaves within the current selection.
   */
  selectedLeafPaths: Set<string>
  /**
   * Set of serialized paths of containers that fully contain the
   * current selection.
   *
   * For a collapsed caret, every container ancestor satisfies this:
   * the caret is a point, and every ancestor contains that point. So
   * every ancestor is in the set.
   *
   * For an expanded selection, only containers whose subtree contains
   * both endpoints satisfy this. Computed as the intersection of the
   * anchor's container ancestors and the focus's container ancestors -
   * a container holds both endpoints iff it is an ancestor of both.
   */
  focusedContainerPaths: Set<string>
  /**
   * Set of serialized paths of containers within the current selection.
   */
  selectedContainerPaths: Set<string>
}

const emptySet = new Set<string>()

const emptyState: SelectionState = {
  focusedLeafPath: undefined,
  selectedLeafPaths: emptySet,
  focusedContainerPaths: emptySet,
  selectedContainerPaths: emptySet,
}

/**
 * Compute which nodes are focused and selected from a range of paths.
 *
 * A node is a container if it is a text block or a registered editable
 * container. All other nodes (spans, inline objects, block objects) are
 * leaves.
 *
 * - `focusedLeafPath` is the focus path when collapsed and it resolves
 *   to a leaf.
 * - `focusedContainerPaths` is the set of containers that fully
 *   contain the current selection (every ancestor for a collapsed
 *   caret; the intersection of anchor and focus ancestors for an
 *   expanded selection).
 */
export function getSelectionState(
  snapshot: TraversalSnapshot,
  selection: {
    anchorPath: Path
    focusPath: Path
    backward: boolean
    isCollapsed: boolean
  } | null,
): SelectionState {
  if (!selection) {
    return emptyState
  }

  const selectedContainerPaths = new Set<string>()
  const selectedLeafPaths = new Set<string>()

  // getNodes expects `from` and `to` in document order. Backward selections
  // (e.g. shift+left) have anchor after focus, so swap for traversal.
  const from = selection.backward ? selection.focusPath : selection.anchorPath
  const to = selection.backward ? selection.anchorPath : selection.focusPath

  for (const {node, path} of getNodes(snapshot, {
    from,
    to,
  })) {
    const serialized = serializePath(path)

    if (
      isTextBlock({schema: snapshot.context.schema}, node) ||
      isEditableContainer(snapshot, node, path)
    ) {
      selectedContainerPaths.add(serialized)
    } else {
      selectedLeafPaths.add(serialized)
    }
  }

  let focusedLeafPath: string | undefined
  const focusedContainerPaths = new Set<string>()

  if (selection.isCollapsed) {
    const serializedFocusPath = serializePath(selection.focusPath)

    if (selectedLeafPaths.has(serializedFocusPath)) {
      focusedLeafPath = serializedFocusPath
    }

    for (const {node, path: ancestorPath} of getAncestors(
      snapshot,
      selection.focusPath,
    )) {
      if (
        isTextBlock({schema: snapshot.context.schema}, node) ||
        isEditableContainer(snapshot, node, ancestorPath)
      ) {
        focusedContainerPaths.add(serializePath(ancestorPath))
      }
    }
  } else {
    // A container fully contains an expanded selection iff it is an
    // ancestor of BOTH endpoints. Intersect anchor-side and focus-side
    // container ancestors.
    const anchorContainerAncestors = new Set<string>()
    for (const {node, path: ancestorPath} of getAncestors(
      snapshot,
      selection.anchorPath,
    )) {
      if (
        isTextBlock({schema: snapshot.context.schema}, node) ||
        isEditableContainer(snapshot, node, ancestorPath)
      ) {
        anchorContainerAncestors.add(serializePath(ancestorPath))
      }
    }
    for (const {node, path: ancestorPath} of getAncestors(
      snapshot,
      selection.focusPath,
    )) {
      const serialized = serializePath(ancestorPath)
      if (
        anchorContainerAncestors.has(serialized) &&
        (isTextBlock({schema: snapshot.context.schema}, node) ||
          isEditableContainer(snapshot, node, ancestorPath))
      ) {
        focusedContainerPaths.add(serialized)
      }
    }
  }

  return {
    focusedLeafPath,
    selectedLeafPaths:
      selectedLeafPaths.size > 0 ? selectedLeafPaths : emptySet,
    focusedContainerPaths:
      focusedContainerPaths.size > 0 ? focusedContainerPaths : emptySet,
    selectedContainerPaths:
      selectedContainerPaths.size > 0 ? selectedContainerPaths : emptySet,
  }
}
