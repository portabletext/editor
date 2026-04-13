import type {Operation} from '../interfaces/operation'
import type {Range} from '../interfaces/range'

export function inverseOperation(op: Operation): Operation {
  switch (op.type) {
    case 'insert': {
      if (!op.inverse) {
        throw new Error(
          'Cannot invert insert operation without inverse data. Remote operations should not reach the history plugin.',
        )
      }
      return {
        type: 'unset',
        path: op.inverse.path,
      }
    }

    case 'insert_text': {
      return {...op, type: 'remove_text'}
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

      if (op.inverse.type === 'insert') {
        return {
          type: 'insert',
          path: op.inverse.path,
          node: op.inverse.node,
          position: op.inverse.position,
        }
      }

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
