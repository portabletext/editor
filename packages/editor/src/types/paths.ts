import type {Path} from '@sanity/types'
import {isRecord} from '../internal-utils/asserters'

/**
 * @public
 */
export type BlockPath = [{_key: string}]

/**
 * @public
 */
export function isBlockPath(path: Path): path is BlockPath {
  const firstSegment = path.at(0)

  return (
    path.length === 1 &&
    firstSegment !== undefined &&
    isRecord(firstSegment) &&
    '_key' in firstSegment &&
    typeof firstSegment._key === 'string'
  )
}

/**
 * @public
 */
export type AnnotationPath = [{_key: string}, 'markDefs', {_key: string}]

/**
 * @public
 */
export type ChildPath = [{_key: string}, 'children', {_key: string}]
