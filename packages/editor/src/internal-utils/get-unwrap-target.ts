import type {EditorSchema} from '../editor/editor-schema'
import {getChildren} from '../node-traversal/get-children'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'

/**
 * Walk up from `originPath` (an empty editable container) looking for
 * the outermost ancestor whose parent's field accepts every type in
 * `payloadTypes`. Every container in the chain must be the only child
 * in its own parent's field, otherwise promoting past it would damage
 * siblings and the function returns `undefined`.
 *
 * The returned path is the outermost empty container to unwrap; the
 * caller unsets every container from `originPath` up through this
 * path and lands the payload at the parent's sibling position.
 *
 * Reaching root level (no enclosing container) only succeeds if root
 * accepts every type in `payloadTypes`. Root accepts text blocks plus
 * the registered block-object types in `schema.blockObjects`. If the
 * payload contains a type that root doesn't declare, the function
 * returns `undefined`.
 */
export function getUnwrapTarget(
  context: {
    schema: EditorSchema
    containers: Containers
    value: Array<Node>
  },
  originPath: Path,
  payloadTypes: ReadonlySet<string>,
): Path | undefined {
  let current = originPath

  while (true) {
    const enclosing = getEnclosingContainer(context, current)

    if (!enclosing) {
      const rootAccepted = getRootAcceptedTypes(context.schema)
      if ([...payloadTypes].every((type) => rootAccepted.has(type))) {
        return current
      }
      return undefined
    }

    const accepted = new Set(enclosing.of.map((member) => member.type))
    if ([...payloadTypes].every((type) => accepted.has(type))) {
      return current
    }

    if (getChildren(context, enclosing.path).length !== 1) {
      return undefined
    }

    current = enclosing.path
  }
}
