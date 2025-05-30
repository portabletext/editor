import type {Path} from '@sanity/types'

export type KeyedEditorSelection = {
  anchor: KeyedEditorSelectionPoint
  focus: KeyedEditorSelectionPoint
  backward?: boolean
} | null

export type KeyedEditorSelectionPoint = {
  path: Path
  offset: number
}
