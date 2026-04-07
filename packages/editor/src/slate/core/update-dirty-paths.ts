import {isKeyedSegment} from '../../utils/util.is-keyed-segment'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'

/**
 * Serialize a path to a string for use as a dedup key.
 * Keyed segments use their _key value, other segments use String().
 */
function serializePathKey(path: Path): string {
  return path
    .map((segment) => {
      if (isKeyedSegment(segment)) {
        return segment._key
      }
      return String(segment)
    })
    .join(',')
}

/**
 * Update editor dirty paths.
 *
 * With keyed paths, no transform is needed because keyed paths are stable
 * across insert_node and remove_node operations.
 */
export function updateDirtyPaths(editor: Editor, newDirtyPaths: Path[]) {
  const dirtyPaths = editor.dirtyPaths
  const dirtyPathKeys = editor.dirtyPathKeys

  const add = (path: Path) => {
    const key = serializePathKey(path)

    if (!dirtyPathKeys.has(key)) {
      dirtyPathKeys.add(key)
      dirtyPaths.push(path)
    }
  }

  for (const path of newDirtyPaths) {
    add(path)
  }

  editor.dirtyPaths = dirtyPaths
  editor.dirtyPathKeys = dirtyPathKeys
}
