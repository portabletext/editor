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

    case 'set': {
      if (!op.inverse) {
        throw new Error(
          'Cannot invert set operation without inverse data. Remote operations should not reach the history plugin.',
        )
      }

      if (op.inverse.type === 'set') {
        // Property existed before: inverse is set back to old value
        return {
          type: 'set',
          path: op.inverse.path,
          value: op.inverse.value,
          inverse: {type: 'set', path: op.path, value: op.value},
        }
      }
      // Property was new: inverse is unset
      return {
        type: 'unset',
        path: op.inverse.path,
        inverse: {type: 'set', path: op.path, value: op.value},
      }
    }

    case 'unset': {
      if (!op.inverse) {
        throw new Error(
          'Cannot invert unset operation without inverse data. Remote operations should not reach the history plugin.',
        )
      }

      // Inverse of unset is always set (restore the old value)
      return {
        type: 'set',
        path: op.inverse.path,
        value: op.inverse.value,
        inverse: {type: 'unset', path: op.path},
      }
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
