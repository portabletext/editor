import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Operation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'
import type {Range} from '../interfaces/range'

export function inverseOperation(op: Operation): Operation {
  switch (op.type) {
    case 'insert_node': {
      // The insert path references a sibling (the last keyed segment
      // is the sibling to insert before/after). The remove path must
      // reference the inserted node itself.
      const removePath =
        op.node._key !== undefined
          ? replaceLastNodeSegment(op.path, {_key: op.node._key})
          : op.path
      return {
        type: 'remove_node',
        path: removePath,
        node: op.node,
      }
    }

    case 'insert_text': {
      return {...op, type: 'remove_text'}
    }

    case 'remove_node': {
      // The removed node's path references itself. Since the node doesn't
      // exist as a sibling after removal, use an adjacent node as reference.
      if (op.previousSiblingKey) {
        const insertPath = replaceLastNodeSegment(op.path, {
          _key: op.previousSiblingKey,
        })
        return {
          type: 'insert_node',
          path: insertPath,
          node: op.node,
          position: 'after',
        }
      }

      // No previous sibling: the node was the first child.
      // Use numeric index 0 to insert at the beginning.
      const insertPath = replaceLastNodeSegment(op.path, 0)
      return {
        type: 'insert_node',
        path: insertPath,
        node: op.node,
        position: 'before',
      }
    }

    case 'remove_text': {
      return {...op, type: 'insert_text'}
    }

    case 'set_node': {
      const {properties, newProperties} = op
      return {...op, properties: newProperties, newProperties: properties}
    }

    case 'set_selection': {
      const {properties, newProperties} = op

      if (properties == null) {
        return {
          ...op,
          properties: newProperties as Range,
          newProperties: null,
        }
      } else if (newProperties == null) {
        return {
          ...op,
          properties: null,
          newProperties: properties as Range,
        }
      } else {
        return {...op, properties: newProperties, newProperties: properties}
      }
    }
  }
}

/**
 * Replace the last node segment (keyed or numeric) in a path.
 */
function replaceLastNodeSegment(path: Path, segment: Path[number]): Path {
  const lastIndex = findLastNodeSegmentIndex(path)
  if (lastIndex === -1) {
    return [segment]
  }
  const result = [...path]
  result[lastIndex] = segment
  return result
}

/**
 * Find the index of the last node segment (keyed or numeric) in a path.
 * String segments are field names, not node references.
 */
function findLastNodeSegmentIndex(path: Path): number {
  for (let i = path.length - 1; i >= 0; i--) {
    if (isKeyedSegment(path[i]) || typeof path[i] === 'number') {
      return i
    }
  }
  return -1
}
