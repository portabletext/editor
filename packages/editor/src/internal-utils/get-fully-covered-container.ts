import {getNode} from '../node-traversal/get-node'
import {getContainerScopedName} from '../schema/get-container-scoped-name'
import {isEditableContainer} from '../schema/is-editable-container'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {Path} from '../slate/interfaces/path'
import type {Range} from '../slate/interfaces/range'
import {commonPath} from '../slate/path/common-path'
import {parentPath} from '../slate/path/parent-path'
import {pointEquals} from '../slate/point/point-equals'
import {rangeEdges} from '../slate/range/range-edges'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Walk up from the lowest common ancestor of `range`'s endpoints and
 * return the outermost structural container the range covers from its
 * deepest first leaf to its deepest last leaf. Stops as soon as an
 * ancestor's start/end leaf points don't match the range's. Returns
 * `undefined` if no ancestor in the chain qualifies.
 *
 * Only considers containers whose editable field does NOT accept
 * text-block (e.g. a table whose `rows` only accept rows). Editable
 * containers whose field accepts text-block (e.g. a fact-box) are
 * skipped — selecting all the text inside such a container should
 * leave the shell with an empty placeholder block, not delete the
 * container itself.
 *
 * Intended for callers that need to know "did the user select a whole
 * structural container?" before delegating to a textual delete
 * primitive that would unhang the range and lose the original
 * boundary signal.
 */
export function getFullyCoveredContainer(
  editor: PortableTextSlateEditor,
  range: Range,
): Path | undefined {
  const [start, end] = rangeEdges(range, editor)
  const lca = commonPath(start.path, end.path)

  // The lca may end in a field segment (e.g. `[{table}, 'rows']`); in
  // that case the children at the LCA are siblings inside the keyed
  // parent (the table). Strip a trailing field segment so the walk
  // starts at the parent node itself.
  let cursor: Path =
    lca.length > 0 && typeof lca[lca.length - 1] === 'string'
      ? lca.slice(0, -1)
      : lca

  let outermost: Path | undefined
  while (cursor.length > 0) {
    const entry = getNode(editor, cursor)
    if (!entry) {
      break
    }
    if (isEditableContainer(editor, entry.node, cursor)) {
      const containerStart = editorStart(editor, cursor)
      const containerEnd = editorEnd(editor, cursor)
      if (
        !pointEquals(start, containerStart) ||
        !pointEquals(end, containerEnd)
      ) {
        return outermost
      }
      const scopedName = getContainerScopedName(editor, entry.node, cursor)
      const container = editor.containers.get(scopedName)
      const fieldAcceptsTextBlock = container?.field.of.some(
        (member) => member.type === editor.schema.block.name,
      )
      if (!fieldAcceptsTextBlock) {
        outermost = cursor
      }
    }
    cursor = parentPath(cursor)
  }
  return outermost
}
