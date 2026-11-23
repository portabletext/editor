import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import {commonPath} from '../engine/path/common-path'
import {isSiblingPath} from '../engine/path/is-sibling-path'
import {transformPoint} from '../engine/point/transform-point'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import {findNearestSpans, firstSpanIn} from './find-nearest-spans'

export function mapPointThroughRemoval(
  snapshot: TraversalSnapshot,
  point: Point,
  removedPath: Path,
): Point | null {
  const result = transformPoint(snapshot.context, point, {
    type: 'unset',
    path: removedPath,
  })
  if (result != null) {
    return result
  }

  const {previousSpan, nextSpan} = findNearestSpans(snapshot, removedPath)
  const preferNext =
    nextSpan !== undefined &&
    (previousSpan === undefined ||
      (!isSiblingPath(previousSpan.path, removedPath) &&
        commonPath(previousSpan.path, removedPath).length <=
          commonPath(nextSpan.path, removedPath).length))

  if (preferNext) {
    return {path: nextSpan.path, offset: 0}
  }
  if (previousSpan) {
    return {path: previousSpan.path, offset: previousSpan.node.text.length}
  }
  const ownSpan = firstSpanIn(snapshot, removedPath)
  return ownSpan ? {path: ownSpan.path, offset: 0} : null
}
