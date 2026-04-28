import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {getEnclosingContainer} from './get-enclosing-container'
import type {Containers} from './resolve-containers'

/**
 * Returns true if the parent field at the given path accepts a text block in
 * its `of` declaration. Root and unknown contexts default to true (root
 * always accepts text blocks).
 *
 * Used by deletion paths to decide whether a node can be removed: a node
 * gets unset only if its parent context can be substituted with an empty
 * text block. A cell at `row.cells` (`of: [{type: 'cell'}]`) cannot be
 * removed; a line at `code-block.lines` (`of: [{type: 'block'}]`) can.
 */
export function parentAcceptsTextBlock(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  path: Path,
): boolean {
  if (path.length <= 1) {
    return true
  }
  const enclosing = getEnclosingContainer(context, path)
  if (!enclosing) {
    return true
  }
  return enclosing.of.some((of) => of.type === 'block')
}
