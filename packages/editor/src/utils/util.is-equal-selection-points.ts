import type {EditorSelectionPoint} from '../types/editor'

/**
 * @public
 */
export function isEqualSelectionPoints(
  a: EditorSelectionPoint,
  b: EditorSelectionPoint,
) {
  return (
    a.offset === b.offset && JSON.stringify(a.path) === JSON.stringify(b.path)
  )
}
