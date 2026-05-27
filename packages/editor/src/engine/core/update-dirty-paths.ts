import {serializePath} from '../../paths/serialize-path'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'

export function updateDirtyPaths(editor: Editor, newDirtyPaths: Path[]) {
  const dirtyPaths = editor.dirtyPaths
  const dirtyPathKeys = editor.dirtyPathKeys

  const add = (path: Path) => {
    const key = serializePath(path)

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
