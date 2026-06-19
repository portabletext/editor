import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../engine/interfaces/path'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import {resolveContainerAt} from '../schema/resolve-container-at'
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
 * A selection whose endpoints terminate at the root level (collapsed at
 * a root-level node, or expanded across root siblings without descending
 * into them) is treated as the user pointing AT the named node(s) rather
 * than INTO them; the envelope is returned as-is and the unwrap walk is
 * skipped. This is how a chrome drag carries the container itself rather
 * than its unwrapped content.
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
> = (snapshot) => {
  const envelope = getSelectedValue(snapshot)

  if (envelope.length === 0) {
    return []
  }

  const selection = snapshot.context.selection
  if (
    selection &&
    selection.anchor.path.length <= 1 &&
    selection.focus.path.length <= 1
  ) {
    return envelope.map((block) => ({
      node: block,
      path: [{_key: block._key}],
    }))
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
