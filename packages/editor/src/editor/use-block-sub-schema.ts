import type {Schema} from '@portabletext/schema'
import {getPathSubSchema} from '../schema/get-path-sub-schema'
import type {Path} from '../slate/interfaces/path'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'

/**
 * Hook: resolve the sub-schema that applies at `path`.
 *
 * Walks ancestors to the nearest registered container and returns the
 * sub-schema from its `{type: 'block'}` entry. Falls back to the root
 * schema view when no container ancestor exists.
 */
export function useBlockSubSchema(path: Path): Schema {
  const editor = useSlateStatic()
  return getPathSubSchema(editor, path)
}
