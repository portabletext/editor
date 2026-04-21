import {
  getBlockSubSchema,
  type BlockSubSchema,
} from '../schema/get-block-sub-schema'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'

/**
 * Hook: resolve the sub-schema that applies at `path`.
 *
 * Walks ancestors to the nearest registered container and returns the
 * sub-schema from its `{type: 'block'}` entry. Falls back to the root
 * schema view when no container ancestor exists.
 */
export function useBlockSubSchema(path: Path): BlockSubSchema {
  const editor = useSlateStatic()
  return getBlockSubSchema(
    {
      schema: editor.schema,
      containers: editor.containers,
      value: editor.children as unknown as Array<Node>,
    },
    path,
  )
}
