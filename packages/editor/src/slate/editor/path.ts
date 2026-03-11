import {Node, Path, Point, Range, type EditorInterface} from '../interfaces'
import {isKeyedSegment} from '../../types/paths'

export const path: EditorInterface['path'] = (editor, at, options = {}) => {
  const {depth, edge} = options

  if (Path.isPath(at)) {
    if (edge === 'start') {
      const [, firstPath] = Node.first(editor, at, editor.schema)
      at = firstPath
    } else if (edge === 'end') {
      const [, lastPath] = Node.last(editor, at, editor.schema)
      at = lastPath
    }
  }

  if (Range.isRange(at)) {
    if (edge === 'start') {
      at = Range.start(editor, at)
    } else if (edge === 'end') {
      at = Range.end(editor, at)
    } else {
      at = Path.common(at.anchor.path, at.focus.path)
    }
  }

  if (Point.isPoint(at)) {
    at = at.path
  }

  if (depth != null) {
    // With keyed paths, each "level" is 2 segments (fieldName + key),
    // except the root level which is 1 segment (just the key).
    // Count keyed segments to find the slice point for the desired depth.
    let keyCount = 0
    let sliceAt = at.length
    for (let i = 0; i < at.length; i++) {
      if (isKeyedSegment(at[i]!) || typeof at[i] === 'number') {
        keyCount++
        if (keyCount === depth) {
          sliceAt = i + 1
          break
        }
      }
    }
    at = at.slice(0, sliceAt)
  }

  return at
}
