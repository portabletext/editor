import {isTextBlock} from '@portabletext/schema'
import {getAncestor} from '../node-traversal/get-ancestor'
import {getNode} from '../node-traversal/get-node'
import {getContainerScopedName} from '../schema/get-container-scoped-name'
import {isEditableContainer} from '../schema/is-editable-container'
import {lookupContainer} from '../schema/lookup-container'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import type {Range} from '../slate/interfaces/range'
import {parentPath} from '../slate/path/parent-path'
import {isAfterPoint} from '../slate/point/is-after-point'
import {isBeforePoint} from '../slate/point/is-before-point'
import {pointEquals} from '../slate/point/point-equals'
import {rangeEdges} from '../slate/range/range-edges'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Find every container that is fully covered by `range`, walking up
 * from each endpoint independently.
 *
 * "Fully covered" means the range reaches both deepest endpoints of
 * the container, AND removing it makes structural sense — the parent's
 * field accepts a text-block, so normalization can replace the unset
 * container with a placeholder.
 *
 * An editable container that holds the entire range inside itself
 * (e.g. selecting all text inside a callout) is intentionally not
 * marked: the textual delete clears its content and preserves the
 * shell.
 *
 * Returns one path per side. Callers unset the end-side path first
 * so the start path stays valid.
 */
export function getFullyCoveredContainers(
  editor: PortableTextSlateEditor,
  range: Range,
): {start: Path | undefined; end: Path | undefined} {
  const [start, end] = rangeEdges(range, editor)
  return {
    start: getAncestor(editor, start.path, (node, path) =>
      isFullyCovered(editor, node, path, start, end),
    )?.path,
    end: getAncestor(editor, end.path, (node, path) =>
      isFullyCovered(editor, node, path, start, end),
    )?.path,
  }
}

function isFullyCovered(
  editor: PortableTextSlateEditor,
  node: Node,
  path: Path,
  rangeStart: Point,
  rangeEnd: Point,
): boolean {
  if (
    !isEditableContainer(editor, node, path) ||
    isTextBlock({schema: editor.schema}, node)
  ) {
    return false
  }

  const root = {children: editor.children}
  const containerStart = editorStart(editor, path)
  const containerEnd = editorEnd(editor, path)

  // The range must reach both deepest endpoints of the container.
  const reachesStart =
    pointEquals(rangeStart, containerStart) ||
    isBeforePoint(rangeStart, containerStart, root)
  const reachesEnd =
    pointEquals(rangeEnd, containerEnd) ||
    isAfterPoint(rangeEnd, containerEnd, root)
  if (!reachesStart || !reachesEnd) {
    return false
  }

  // PR #2587: when an editable container exactly contains the range
  // (its field accepts a text-block, so the textual delete can clear
  // its content and leave a placeholder), preserve the shell.
  if (
    pointEquals(rangeStart, containerStart) &&
    pointEquals(rangeEnd, containerEnd) &&
    fieldAcceptsTextBlock(editor, node, path)
  ) {
    return false
  }

  // Removal must make structural sense at this point in the tree.
  return parentFieldAcceptsTextBlock(editor, path)
}

function parentFieldAcceptsTextBlock(
  editor: PortableTextSlateEditor,
  path: Path,
): boolean {
  const parent = parentPath(path)
  if (parent.length === 0) {
    return true
  }
  const parentEntry = getNode(editor, parent)
  if (!parentEntry) {
    return false
  }
  return fieldAcceptsTextBlock(editor, parentEntry.node, parent)
}

function fieldAcceptsTextBlock(
  editor: PortableTextSlateEditor,
  node: Node,
  path: Path,
): boolean {
  const scopedName = getContainerScopedName(editor, node, path)
  const container = lookupContainer(editor.containers, scopedName)
  if (!container) {
    return false
  }
  return container.field.of.some(
    (member) => member.type === editor.schema.block.name,
  )
}
