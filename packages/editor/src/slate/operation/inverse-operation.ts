import type {Operation} from '../interfaces/operation'
import type {Range} from '../interfaces/range'

export function inverseOperation(op: Operation): Operation {
  switch (op.type) {
    case 'insert_node': {
      return {...op, type: 'remove_node'}
    }

    case 'insert_text': {
      return {...op, type: 'remove_text'}
    }

    case 'remove_node': {
      return {...op, type: 'insert_node'}
    }

    case 'remove_text': {
      return {...op, type: 'insert_text'}
    }

    case 'set_node': {
      const {properties, newProperties} = op
      return {...op, properties: newProperties, newProperties: properties}
    }

    case 'set_node_keyed': {
      const {properties, newProperties} = op
      return {
        type: 'set_node_keyed',
        path: op.path,
        properties: newProperties,
        newProperties: properties,
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
