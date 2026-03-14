import type {ExtendedType} from '../types/custom-types'
import type {RangeDirection} from '../types/types'
import type {Point} from './point'

/**
 * `Range` objects are a set of points that refer to a specific span of a Slate
 * document. They can define a span inside a single node or a can span across
 * multiple nodes.
 */

export interface BaseRange {
  anchor: Point
  focus: Point
}

export type Range = ExtendedType<'Range', BaseRange>

export interface RangeEdgesOptions {
  reverse?: boolean
}

export interface RangeTransformOptions {
  affinity?: RangeDirection | null
}
