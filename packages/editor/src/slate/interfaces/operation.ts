import type {Node} from './node'
import type {Path} from './path'
import type {Range} from './range'

export type BaseInsertNodeOperation = {
  type: 'insert_node'
  path: Path
  node: Node
}

export type InsertNodeOperation = BaseInsertNodeOperation

export type BaseInsertTextOperation = {
  type: 'insert_text'
  path: Path
  offset: number
  text: string
}

export type InsertTextOperation = BaseInsertTextOperation

export type BaseRemoveNodeOperation = {
  type: 'remove_node'
  path: Path
  node: Node
}

export type RemoveNodeOperation = BaseRemoveNodeOperation

export type BaseRemoveTextOperation = {
  type: 'remove_text'
  path: Path
  offset: number
  text: string
}

export type RemoveTextOperation = BaseRemoveTextOperation

export type BaseSetNodeOperation = {
  type: 'set_node'
  path: Path
  properties: Partial<Node>
  newProperties: Partial<Node>
}

export type SetNodeOperation = BaseSetNodeOperation

type BaseSetSelectionOperation =
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

type SetSelectionOperation = BaseSetSelectionOperation

export type BaseOperation =
  | InsertNodeOperation
  | RemoveNodeOperation
  | SetNodeOperation
  | SetSelectionOperation
  | InsertTextOperation
  | RemoveTextOperation
export type Operation = BaseOperation
