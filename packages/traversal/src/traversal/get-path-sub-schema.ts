import {getSubSchema, type Schema} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {
  getDeclarationsInScope,
  resolveReferencesInScope,
} from '../schema/declarations-in-scope'
import {getEnclosingContainer} from '../schema/get-enclosing-container'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Return the `Schema` view that applies at a given path.
 *
 * For paths at the root of the document, or for paths where no ancestor is
 * a registered container, returns the top-level schema. For paths inside a
 * container, walks ancestors to find the nearest container and returns the
 * sub-schema derived from its `of` declaration. A bare type reference in
 * that `of` resolves to the nearest declaration of the type on the path's
 * ancestors, then to the schema's root block objects.
 *
 * @public
 */
export function getPathSubSchema(
  snapshot: TraversalSnapshot,
  path: Path,
): Schema {
  const enclosing = getEnclosingContainer(snapshot, path)

  if (!enclosing) {
    return snapshot.context.schema
  }

  return getSubSchema(
    snapshot.context.schema,
    resolveReferencesInScope(
      snapshot.context.schema,
      enclosing.of,
      getDeclarationsInScope(snapshot, path),
    ),
  )
}
