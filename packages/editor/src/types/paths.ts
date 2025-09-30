import type {Path} from '@sanity/types'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

/**
 * @public
 */
export type AnnotationPath = [{_key: string}, 'markDefs', {_key: string}]

/**
 * @public
 */
export type ChildPath = [{_key: string}, 'children', {_key: string}]
