import {isSpan, type PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {Path} from '../engine/interfaces/path'
import {pathEquals} from '../engine/path/path-equals'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import {resolveContainerAt} from '../schema/resolve-container-at'
import {getLeaf} from '../traversal/get-leaf'
import type {BlockPath} from '../types/paths'
import {getSelectedValue} from './selector.get-selected-value'

/**
 * Returns the smallest top-level-valid fragment of the editor's value
 * that covers the current selection.
 *
 * Starts from {@link getSelectedValue}'s envelope and unwraps it toward
 * the selection's lowest common ancestor, stopping at the deepest level
 * whose siblings are all root-accepted types. Intermediate single-child
 * containers (a single row inside a table, a single cell inside a row)
 * are walked through to look for a deeper unwrap target; an intermediate
 * level with multiple siblings (the lowest common ancestor across two
 * cells in one row) ends the walk and the last root-valid wrapping is
 * returned.
 *
 * Backs every registered clipboard converter, `editor.getFragment()`
 * (which projects to blocks only), and the drag preview pipeline (which
 * uses the paths to find DOM nodes). Exposed for custom converters and
 * any consumer that needs the clipboard-shaped view of the current
 * selection without redundant ancestor envelopes.
 *
 * @public
 */
export const getFragment: EditorSelector<
  Array<{node: PortableTextBlock; path: BlockPath}>
> = (snapshot) => walkFragment(snapshot, {stopAtCoveredContainer: false})

/**
 * Returns the fragment that should be serialized at drag time when the
 * user grabs a container as a unit.
 *
 * Same as {@link getFragment}, except the unwrap stops as soon as the
 * selection covers a single container's entire content (start at its
 * first leaf, end at its last leaf). Without this guard a container
 * wrapping root-accepted blocks (a callout around a paragraph) would
 * unwrap to its inner blocks and the container envelope would be lost
 * on drop.
 *
 * Should only be used when the drag event originated from a container's
 * own chrome - {@link getEventPosition} sets `EventPosition.isContainer`
 * to signal this, and the portable-text converter routes here when that
 * flag is set on the originating `drag.dragstart` event. Selection
 * shape alone cannot distinguish a chrome drag from a multi-block
 * content drag that happens to span the container's full extent, so
 * the routing belongs at the event-origin layer, not in this function.
 *
 * Destination-fit unwrap stays the drop side's responsibility: dropping
 * the container envelope into a destination that doesn't accept it is
 * handled by the drop pipeline.
 *
 * @public
 */
export const getDragFragment: EditorSelector<
  Array<{node: PortableTextBlock; path: BlockPath}>
> = (snapshot) => walkFragment(snapshot, {stopAtCoveredContainer: true})

function walkFragment(
  snapshot: EditorSnapshot,
  options: {stopAtCoveredContainer: boolean},
): Array<{node: PortableTextBlock; path: BlockPath}> {
  const envelope = getSelectedValue(snapshot)

  if (envelope.length === 0) {
    return []
  }

  const {schema, containers, value} = snapshot.context
  const rootAcceptedTypes = getRootAcceptedTypes(schema)
  const textBlockName = schema.block.name

  // The outer envelope is rooted in `editor.value` so its top-level types
  // are root-accepted by construction.
  let lastRootValid: Array<PortableTextBlock> = envelope
  let lastRootValidPrefix: Path = []
  let current: Array<PortableTextBlock> = envelope
  const pathPrefix: Path = []

  while (current.length === 1) {
    const single = current[0]!
    const singlePath: Path = [...pathPrefix, {_key: single._key}]
    const container = resolveContainerAt(containers, value, singlePath)

    if (!container || !('field' in container)) {
      break
    }

    if (
      options.stopAtCoveredContainer &&
      selectionCoversNode(snapshot, singlePath)
    ) {
      // Drag-of-container caller asked to stop unwrapping here. Return
      // the container itself as the fragment.
      lastRootValid = [single]
      lastRootValidPrefix = pathPrefix
      break
    }

    const children = (single as Record<string, unknown>)[container.field.name]
    if (!Array.isArray(children) || children.length === 0) {
      break
    }

    const childBlocks = children as Array<PortableTextBlock>
    pathPrefix.push({_key: single._key}, container.field.name)
    current = childBlocks

    const allRootAccepted = childBlocks.every(
      (block) =>
        block._type === textBlockName || rootAcceptedTypes.has(block._type),
    )

    if (allRootAccepted) {
      lastRootValid = childBlocks
      lastRootValidPrefix = [...pathPrefix]
      // Keep walking - a deeper level might also be root-valid (a single
      // block inside the cell that is itself a container, etc.).
      continue
    }

    // Children are intermediate types (e.g. `row`, `cell`). If there is
    // a single intermediate child, walk through it; otherwise the lowest
    // common ancestor is here and we stop with the last root-valid level.
    if (childBlocks.length !== 1) {
      break
    }
  }

  return lastRootValid.map((block) => ({
    node: block,
    path: [...lastRootValidPrefix, {_key: block._key}],
  }))
}

/**
 * True when the current selection's endpoints coincide with the node at
 * `nodePath`'s first leaf at offset 0 and its last leaf at the leaf's
 * end. Used by {@link getDragFragment} to decide whether to stop
 * unwrapping at the container level.
 */
function selectionCoversNode(
  snapshot: EditorSnapshot,
  nodePath: Path,
): boolean {
  const selection = snapshot.context.selection
  if (!selection) {
    return false
  }

  const firstLeaf = getLeaf(snapshot, nodePath, {edge: 'start'})
  const lastLeaf = getLeaf(snapshot, nodePath, {edge: 'end'})
  if (!firstLeaf || !lastLeaf) {
    return false
  }

  const startPoint = selection.backward ? selection.focus : selection.anchor
  const endPoint = selection.backward ? selection.anchor : selection.focus

  if (!pathEquals(startPoint.path, firstLeaf.path)) {
    return false
  }
  if (!pathEquals(endPoint.path, lastLeaf.path)) {
    return false
  }
  if (startPoint.offset !== 0) {
    return false
  }
  const lastLeafEndOffset = isSpan(
    {schema: snapshot.context.schema},
    lastLeaf.node as PortableTextBlock,
  )
    ? (lastLeaf.node as unknown as {text: string}).text.length
    : 0
  return endPoint.offset === lastLeafEndOffset
}
