import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getEnclosingBlock} from '../traversal/get-enclosing-block'
import type {BlockPath} from '../types/paths'

/**
 * Returns the block containing the focus selection, resolved at any depth.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the innermost block ancestor (the line), not the outer
 * container. When the focus is at root, behavior is unchanged.
 *
 * To gate UI on "is the focus inside a container of type X?", do not compare
 * `getFocusBlock(snapshot)?.node._type` against the container's `_type`. It
 * will never match because this selector resolves past the container to the
 * inner block. Walk the ancestor chain instead with
 * {@link getAncestors} from `@portabletext/editor/traversal`.
 *
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  return getEnclosingBlock(snapshot, selection.focus.path)
}
