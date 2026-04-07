import type {Node} from './node'
import type {Path} from './path'
import type {Range} from './range'

export type InsertNodeOperation = {
  type: 'insert_node'
  path: Path
  node: Node
  position: 'before' | 'after'
}

export type InsertTextOperation = {
  type: 'insert_text'
  path: Path
  offset: number
  text: string
}

export type RemoveNodeOperation = {
  type: 'remove_node'
  path: Path
  node: Node
  previousSiblingKey?: string
}

export type RemoveTextOperation = {
  type: 'remove_text'
  path: Path
  offset: number
  text: string
}

export type SetNodeOperation = {
  type: 'set_node'
  path: Path
  properties: Partial<Node>
  newProperties: Partial<Node>
}

type SetSelectionOperation =
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

export type Operation =
  | InsertNodeOperation
  | RemoveNodeOperation
  | SetNodeOperation
  | SetSelectionOperation
  | InsertTextOperation
  | RemoveTextOperation
