import {isTextBlock} from '@portabletext/schema'
import {end as editorEnd} from '../engine/editor/end'
import {start as editorStart} from '../engine/editor/start'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import type {Range} from '../engine/interfaces/range'
import {parentPath} from '../engine/path/parent-path'
import {isAfterPoint} from '../engine/point/is-after-point'
import {isBeforePoint} from '../engine/point/is-before-point'
import {pointEquals} from '../engine/point/point-equals'
import {rangeEdges} from '../engine/range/range-edges'
import {isEditableContainer} from '../schema/is-editable-container'
import {getAncestor} from '../traversal/get-ancestor'
import {getNode} from '../traversal/get-node'
import type {PortableTextEditorEngine} from '../types/editor-engine'

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
  editor: PortableTextEditorEngine,
  range: Range,
): {start: Path | undefined; end: Path | undefined} {
  const [start, end] = rangeEdges(range, editor.snapshot.context)
  return {
    start: getAncestor(editor.snapshot, start.path, {
      match: (node, path) => isFullyCovered(editor, node, path, start, end),
    })?.path,
    end: getAncestor(editor.snapshot, end.path, {
      match: (node, path) => isFullyCovered(editor, node, path, start, end),
    })?.path,
  }
}

function isFullyCovered(
  editor: PortableTextEditorEngine,
  node: Node,
  path: Path,
  rangeStart: Point,
  rangeEnd: Point,
): boolean {
  if (
    !isEditableContainer(editor.snapshot, node, path) ||
    isTextBlock({schema: editor.snapshot.context.schema}, node)
  ) {
    return false
  }

  const root = {value: editor.snapshot.context.value}
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
  editor: PortableTextEditorEngine,
  path: Path,
): boolean {
  const parent = parentPath(path)
  if (parent.length === 0) {
    return true
  }
  const parentEntry = getNode(editor.snapshot, parent)
  if (!parentEntry) {
    return false
  }
  return fieldAcceptsTextBlock(editor, parentEntry.node, parent)
}

function fieldAcceptsTextBlock(
  editor: PortableTextEditorEngine,
  node: Node,
  _path: Path,
): boolean {
  const container = editor.containers.get(node._type)
  if (!container) {
    return false
  }
  return container.field.of.some(
    (member) => member.type === editor.snapshot.context.schema.block.name,
  )
}
