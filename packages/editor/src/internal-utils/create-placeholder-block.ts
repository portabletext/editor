import type {PortableTextSpan} from '@portabletext/schema'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {Containers} from '../schema/resolve-containers'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'

type PlaceholderSnapshot = {
  context: {
    schema: import('../editor/editor-schema').EditorSchema
    containers: Containers
    value: Array<Node>
    keyGenerator: () => string
  }
  blockIndexMap: ReadonlyMap<string, number>
}

/**
 * Create a placeholder text block -- the empty initial block used when the
 * editor value is empty or when a container needs a default child.
 *
 * When `path` is provided and points into a container, the placeholder
 * uses the container's default style. Without `path`, or at root depth,
 * falls back to the root schema's first style.
 */
export function createPlaceholderBlock(
  snapshot: PlaceholderSnapshot,
  path?: Path,
) {
  const style = resolveDefaultStyle(snapshot, path)
  return {
    _type: snapshot.context.schema.block.name,
    _key: snapshot.context.keyGenerator(),
    style,
    markDefs: [],
    children: [
      {
        _type: snapshot.context.schema.span.name,
        _key: snapshot.context.keyGenerator(),
        text: '',
        marks: [],
      } as PortableTextSpan,
    ],
  }
}

function resolveDefaultStyle(
  snapshot: PlaceholderSnapshot,
  path?: Path,
): string {
  const rootFallback = snapshot.context.schema.styles[0]?.name ?? 'normal'
  if (!path) {
    return rootFallback
  }
  const subSchema = getPathSubSchema(snapshot, path)
  return subSchema.styles[0]?.name ?? rootFallback
}
