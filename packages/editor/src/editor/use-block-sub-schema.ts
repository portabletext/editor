import type {Schema} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import {useEngineStatic} from '../engine/react/hooks/use-engine-static'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'

/**
 * Hook: resolve the sub-schema that applies at `path`.
 *
 * Walks ancestors to the nearest registered container and returns the
 * sub-schema from its `{type: 'block'}` entry. Falls back to the root
 * schema view when no container ancestor exists.
 */
export function useBlockSubSchema(path: Path): Schema {
  const editor = useEngineStatic()
  return getPathSubSchema(editor, path)
}
