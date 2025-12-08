import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import type {KeyboardEvent} from 'react'
import type {Descendant, Operation as SlateOperation} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {EditableAPI} from './editor'

type HistoryItem = {
  operations: SlateOperation[]
  timestamp: Date
}

interface History {
  redos: HistoryItem[]
  undos: HistoryItem[]
}

export interface PortableTextSlateEditor extends ReactEditor {
  _key: 'editor'
  _type: 'editor'
  createPlaceholderBlock: () => Descendant
  editable: EditableAPI
  history: History
  insertPortableTextData: (data: DataTransfer) => boolean
  insertTextOrHTMLData: (data: DataTransfer) => boolean
  isTextBlock: (value: unknown) => value is PortableTextTextBlock
  isTextSpan: (value: unknown) => value is PortableTextSpan
  isListBlock: (value: unknown) => value is PortableTextListBlock
  value: Array<PortableTextBlock>
  decoratedRanges: Array<DecoratedRange>
  decoratorState: Record<string, boolean | undefined>
  blockIndexMap: Map<string, number>
  listIndexMap: Map<string, number>

  /**
   * Use hotkeys
   */
  pteWithHotKeys: (event: KeyboardEvent<HTMLDivElement>) => void

  /**
   * Undo
   */
  undo: () => void

  /**
   * Redo
   */
  redo: () => void
}
