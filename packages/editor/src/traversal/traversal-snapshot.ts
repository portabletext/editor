import type {EditorSchema} from '../editor/editor-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'

/**
 * Snapshot-shaped input for traversal utilities.
 *
 * Mirrors the shape of `EditorSnapshot`: ambient state lives under
 * `context`, the `blockIndexMap` perf cache sits as a sibling. An
 * `EditorSnapshot` from `editor.getSnapshot()` satisfies this type
 * structurally, so traversal utilities accept it directly.
 *
 * @beta
 */
export type TraversalSnapshot = {
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  }
  blockIndexMap: Map<string, number>
}
