import {getSubSchema, type Schema} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from '../node-traversal/traversal-snapshot'
import {getEnclosingContainer} from '../schema/get-enclosing-container'

/**
 * Return the `Schema` view that applies at a given path.
 *
 * For paths at the root of the document, or for paths where no ancestor is
 * a registered container, returns the top-level schema. For paths inside a
 * container, walks ancestors to find the nearest container and returns the
 * sub-schema derived from its `of` declaration.
 *
 * @beta
 */
export function getPathSubSchema(
  snapshot: TraversalSnapshot,
  path: Path,
): Schema {
  const enclosing = getEnclosingContainer(snapshot, path)

  if (!enclosing) {
    return snapshot.context.schema
  }

  return getSubSchema(snapshot.context.schema, enclosing.of)
}
