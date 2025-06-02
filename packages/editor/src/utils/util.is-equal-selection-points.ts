import {
  isIndexedSelectionPoint,
  type EditorSelectionPoint,
} from '../editor/editor-selection'

/**
 * @public
 */
export function isEqualSelectionPoints(
  a: EditorSelectionPoint,
  b: EditorSelectionPoint,
) {
  if (isIndexedSelectionPoint(a) && !isIndexedSelectionPoint(b)) {
    throw new Error(
      'Comparing IndexedEditorSelectionPoint to KeyedEditorSelectionPoint',
    )
  }

  if (!isIndexedSelectionPoint(a) && isIndexedSelectionPoint(b)) {
    throw new Error(
      'Comparing KeyedEditorSelectionPoint to IndexedEditorSelectionPoint',
    )
  }

  return (
    a.offset === b.offset && JSON.stringify(a.path) === JSON.stringify(b.path)
  )
}
