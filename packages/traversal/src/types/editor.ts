import type {Path} from '@portabletext/patches'
export type EditorSelectionPoint = {path: Path; offset: number}
export type SelectionRange = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
}
export type EditorSelection = SelectionRange | null
