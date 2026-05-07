import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'

/**
 * Snapshot-shaped input for traversal utilities.
 *
 * Mirrors the shape of `EditorSnapshot`: ambient state lives under
 * `context`, the `blockIndexMap` perf cache sits as a sibling.
 */
export type TraversalSnapshot = {
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  }
  blockIndexMap: Map<string, number>
}
