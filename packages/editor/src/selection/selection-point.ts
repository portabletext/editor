import type {EditorSelectionPoint} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

export function getBlockKeyFromSelectionPoint(point: EditorSelectionPoint) {
  const blockPathSegment = point.path.at(0)

  if (isKeyedSegment(blockPathSegment)) {
    return blockPathSegment._key
  }

  return undefined
}

export function getChildKeyFromSelectionPoint(point: EditorSelectionPoint) {
  const childPathSegment = point.path.at(2)

  if (isKeyedSegment(childPathSegment)) {
    return childPathSegment._key
  }

  return undefined
}
