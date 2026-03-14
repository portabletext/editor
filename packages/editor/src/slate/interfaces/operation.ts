import type {ExtendedType, Node, Path, Range} from '..'

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

export type KeyedPathSegment = {_key: string}
export type KeyedPath = Array<KeyedPathSegment | string>

export type BaseSetNodeKeyedOperation = {
  type: 'set_node_keyed'
  path: KeyedPath
  properties: Partial<Node>
  newProperties: Partial<Node>
}

export type SetNodeKeyedOperation = ExtendedType<
  'SetNodeKeyedOperation',
  BaseSetNodeKeyedOperation
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
  | SetNodeKeyedOperation

export type SelectionOperation = SetSelectionOperation

export type TextOperation = InsertTextOperation | RemoveTextOperation

export type BaseOperation = NodeOperation | SelectionOperation | TextOperation
export type Operation = ExtendedType<'Operation', BaseOperation>
