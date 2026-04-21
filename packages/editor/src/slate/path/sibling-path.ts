import {safeStringify} from '../../internal-utils/safe-json'
import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Path} from '../interfaces/path'

/**
 * Compute the canonical path that a new node will have when inserted as a
 * sibling of an existing node.
 *
 * Preserves the array-field segment that `existingPath` carries. Works at any
 * depth — the caller does not need to know which array field the sibling
 * lives in.
 *
 * [{_key:'b1'}]                                       + 'b2' → [{_key:'b2'}]
 * [{_key:'b1'}, 'children', {_key:'s1'}]              + 's2' → [{_key:'b1'}, 'children', {_key:'s2'}]
 * [{_key:'cb'}, 'lines', {_key:'l1'}]                 + 'l2' → [{_key:'cb'}, 'lines', {_key:'l2'}]
 * [{_key:'t'}, 'rows', {_key:'r'}, 'cells', {_key:'c'}] + 'c2' → [{_key:'t'}, 'rows', {_key:'r'}, 'cells', {_key:'c2'}]
 */
export function siblingPath(existingPath: Path, newKey: string): Path {
  if (existingPath.length === 0) {
    throw new Error(
      `Cannot compute sibling path of the root path [${existingPath}].`,
    )
  }

  const lastSegment = existingPath.at(-1)

  if (!isKeyedSegment(lastSegment)) {
    throw new Error(
      `Expected last segment of sibling path to be a keyed segment, got ${safeStringify(lastSegment)}.`,
    )
  }

  return [...existingPath.slice(0, -1), {_key: newKey}]
}
