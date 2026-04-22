import type {PortableTextSpan} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import type {Containers} from '../schema/resolve-containers'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'

/**
 * Create a placeholder text block -- the empty initial block used when the
 * editor value is empty or when a container needs a default child.
 *
 * When `path` is provided and points into a container, the placeholder
 * uses the container's default style. Without `path`, or at root depth,
 * falls back to the root schema's first style.
 */
export function createPlaceholderBlock(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'> & {
    containers?: Containers
    value?: Array<Node>
  },
  path?: Path,
) {
  const style = resolveDefaultStyle(context, path)
  return {
    _type: context.schema.block.name,
    _key: context.keyGenerator(),
    style,
    markDefs: [],
    children: [
      {
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      } as PortableTextSpan,
    ],
  }
}

function resolveDefaultStyle(
  context: Pick<EditorContext, 'keyGenerator' | 'schema'> & {
    containers?: Containers
    value?: Array<Node>
  },
  path?: Path,
): string {
  const rootFallback = context.schema.styles[0]?.name ?? 'normal'
  if (!path || !context.containers || !context.value) {
    return rootFallback
  }
  const subSchema = getBlockSubSchema(
    {
      schema: context.schema,
      containers: context.containers,
      value: context.value,
    },
    path,
  )
  return subSchema.styles[0]?.name ?? rootFallback
}
