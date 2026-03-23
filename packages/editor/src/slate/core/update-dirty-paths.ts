import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'

/**
 * update editor dirty paths
 *
 * @param newDirtyPaths: Path[]; new dirty paths
 * @param transform: (p: Path) => Path | null; how to transform existing dirty paths
 */
export function updateDirtyPaths(
  editor: Editor,
  newDirtyPaths: Path[],
  transform?: (p: Path) => Path | null,
) {
  const oldDirtyPaths = editor.dirtyPaths
  const oldDirtyPathKeys = editor.dirtyPathKeys
  let dirtyPaths: Path[]
  let dirtyPathKeys: Set<string>

  const add = (path: Path | null) => {
    if (path) {
      const key = path.join(',')

      if (!dirtyPathKeys.has(key)) {
        dirtyPathKeys.add(key)
        dirtyPaths.push(path)
      }
    }
  }

  if (transform) {
    dirtyPaths = []
    dirtyPathKeys = new Set()
    for (const path of oldDirtyPaths) {
      const newPath = transform(path)
      add(newPath)
    }
  } else {
    dirtyPaths = oldDirtyPaths
    dirtyPathKeys = oldDirtyPathKeys
  }

  for (const path of newDirtyPaths) {
    add(path)
  }

  editor.dirtyPaths = dirtyPaths
  editor.dirtyPathKeys = dirtyPathKeys
}
