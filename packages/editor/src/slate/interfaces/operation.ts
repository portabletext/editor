import {isObject, Path, Range, type ExtendedType, type Node} from '..'

export type BaseInsertNodeOperation = {
  type: 'insert_node'
  path: Path
  node: Node
}

export type InsertNodeOperation = ExtendedType<
  'InsertNodeOperation',
  BaseInsertNodeOperation
>

export type BaseInsertTextOperation = {
  type: 'insert_text'
  path: Path
  offset: number
  text: string
}

export type InsertTextOperation = ExtendedType<
  'InsertTextOperation',
  BaseInsertTextOperation
>

export type BaseRemoveNodeOperation = {
  type: 'remove_node'
  path: Path
  node: Node
}

export type RemoveNodeOperation = ExtendedType<
  'RemoveNodeOperation',
  BaseRemoveNodeOperation
>

export type BaseRemoveTextOperation = {
  type: 'remove_text'
  path: Path
  offset: number
  text: string
}

export type RemoveTextOperation = ExtendedType<
  'RemoveTextOperation',
  BaseRemoveTextOperation
>

export type BaseSetNodeOperation = {
  type: 'set_node'
  path: Path
  properties: Partial<Node>
  newProperties: Partial<Node>
}

export type SetNodeOperation = ExtendedType<
  'SetNodeOperation',
  BaseSetNodeOperation
>

export type BaseSetSelectionOperation =
  | {
      type: 'set_selection'
      properties: null
      newProperties: Range
    }
  | {
      type: 'set_selection'
      properties: Partial<Range>
      newProperties: Partial<Range>
    }
  | {
      type: 'set_selection'
      properties: Range
      newProperties: null
    }

export type SetSelectionOperation = ExtendedType<
  'SetSelectionOperation',
  BaseSetSelectionOperation
>

export type NodeOperation =
  | InsertNodeOperation
  | RemoveNodeOperation
  | SetNodeOperation

export type SelectionOperation = SetSelectionOperation

export type TextOperation = InsertTextOperation | RemoveTextOperation

/**
 * `Operation` objects define the low-level instructions that Slate editors use
 * to apply changes to their internal state. Representing all changes as
 * operations is what allows Slate editors to easily implement history,
 * collaboration, and other features.
 */

export type BaseOperation = NodeOperation | SelectionOperation | TextOperation
export type Operation = ExtendedType<'Operation', BaseOperation>

export interface OperationInterface {
  /**
   * Check if a value is an `Operation` object.
   */
  isOperation: (value: any) => value is Operation

  /**
   * Check if a value is a list of `Operation` objects.
   */
  isOperationList: (value: any) => value is Operation[]

  /**
   * Invert an operation, returning a new operation that will exactly undo the
   * original when applied.
   */
  inverse: (op: Operation) => Operation
}

// eslint-disable-next-line no-redeclare
export const Operation: OperationInterface = {
  isOperation(value: any): value is Operation {
    if (!isObject(value)) {
      return false
    }

    switch (value.type) {
      case 'insert_node':
        return Path.isPath(value.path) && isObject(value.node)
      case 'insert_text':
        return (
          typeof value.offset === 'number' &&
          typeof value.text === 'string' &&
          Path.isPath(value.path)
        )
      case 'remove_node':
        return Path.isPath(value.path) && isObject(value.node)
      case 'remove_text':
        return (
          typeof value.offset === 'number' &&
          typeof value.text === 'string' &&
          Path.isPath(value.path)
        )
      case 'set_node':
        return (
          Path.isPath(value.path) &&
          isObject(value.properties) &&
          isObject(value.newProperties)
        )
      case 'set_selection':
        return (
          (value.properties === null && Range.isRange(value.newProperties)) ||
          (value.newProperties === null && Range.isRange(value.properties)) ||
          (isObject(value.properties) && isObject(value.newProperties))
        )
      default:
        return false
    }
  },

  isOperationList(value: any): value is Operation[] {
    return (
      Array.isArray(value) && value.every((val) => Operation.isOperation(val))
    )
  },

  inverse(op: Operation): Operation {
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
  },
}
