import type {ExtendedType} from '../types/custom-types'
import type {Descendant} from './node'
import type {Path} from './path'

/**
 * `Element` objects are a type of node in a Slate document that contain other
 * element nodes or text nodes. They can be either "blocks" or "inlines"
 * depending on the Slate editor's configuration.
 */

export interface BaseElement {
  children: Descendant[]
}

export type Element = ExtendedType<'Element', BaseElement>

/**
 * `ElementEntry` objects refer to an `Element` and the `Path` where it can be
 * found inside a root node.
 */
export type ElementEntry = [Element, Path]
