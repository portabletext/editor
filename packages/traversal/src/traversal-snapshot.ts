import type {Schema} from '@portabletext/schema'
import type {Containers} from './container-types'
import type {Node} from './node'

/**
 * Snapshot-shaped input for traversal utilities.
 *
 * Mirrors the shape of `EditorSnapshot`: ambient state lives under
 * `context`, the optional `indexMap` perf cache sits as a sibling.
 *
 * @public
 */
export type TraversalSnapshot = {
  context: {
    schema: Schema
    containers: Containers
    value: Array<Node>
  }
  indexMap?: ReadonlyMap<string, number>
}
