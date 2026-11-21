import type {EditorSchema} from '../editor/editor-schema'
import type {Node} from '../engine/interfaces/node'
import type {Containers} from '../schema/resolve-containers'

/**
 * The document and schema to traverse. Without `containers`, traversal visits
 * every object field. An empty `containers` map follows text blocks and their
 * children only. `blockIndexMap` is optional.
 * @public
 */
export type TraversalSnapshot = {
  context: {
    schema: EditorSchema
    containers?: Containers
    value: Array<Node>
  }
  blockIndexMap?: ReadonlyMap<string, number>
}
