import {isTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getNodes} from '../node-traversal/get-nodes'
import {serializePath} from '../paths/serialize-path'
import {isEditableContainer} from '../schema/is-editable-container'
import type {ResolvedContainers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'

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
   * Serialized path of the focused container (text block or editable
   * container). Set when the selection is collapsed and has a container
   * ancestor.
   */
  focusedContainerPath: string | undefined
  /**
   * Set of serialized paths of containers within the current selection.
   */
  selectedContainerPaths: Set<string>
}

const emptySet = new Set<string>()

const emptyState: SelectionState = {
  focusedLeafPath: undefined,
  selectedLeafPaths: emptySet,
  focusedContainerPath: undefined,
  selectedContainerPaths: emptySet,
}

/**
 * Compute which nodes are focused and selected from a range of paths.
 *
 * A node is a container if it is a text block or a registered editable
 * container. All other nodes (spans, inline objects, block objects) are
 * leaves.
 *
 * For a collapsed selection:
 * - `focusedLeafPath` is the focus path when it resolves to a leaf.
 * - `focusedContainerPath` is the nearest ancestor container of the focus.
 */
export function getSelectionState(
  context: {
    schema: EditorSchema
    containers: ResolvedContainers
    value: Array<Node>
    blockIndexMap: Map<string, number>
  },
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

  for (const {node, path} of getNodes(context, {
    from,
    to,
  })) {
    const serialized = serializePath(path)

    if (
      isTextBlock({schema: context.schema}, node) ||
      isEditableContainer(context, node, path)
    ) {
      selectedContainerPaths.add(serialized)
    } else {
      selectedLeafPaths.add(serialized)
    }
  }

  let focusedLeafPath: string | undefined
  let focusedContainerPath: string | undefined

  if (selection.isCollapsed) {
    const serializedFocusPath = serializePath(selection.focusPath)

    if (selectedLeafPaths.has(serializedFocusPath)) {
      focusedLeafPath = serializedFocusPath
    }

    for (const {path: ancestorPath} of getAncestors(
      context,
      selection.focusPath,
    )) {
      const serializedAncestorPath = serializePath(ancestorPath)

      if (selectedContainerPaths.has(serializedAncestorPath)) {
        focusedContainerPath = serializedAncestorPath
        break
      }
    }
  }

  return {
    focusedLeafPath,
    selectedLeafPaths:
      selectedLeafPaths.size > 0 ? selectedLeafPaths : emptySet,
    focusedContainerPath,
    selectedContainerPaths:
      selectedContainerPaths.size > 0 ? selectedContainerPaths : emptySet,
  }
}
