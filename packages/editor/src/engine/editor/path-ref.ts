import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import type {PathRef} from '../interfaces/path-ref'
import type {TextDirection} from '../types/types'

export function pathRef(
  editor: Editor,
  path: Path,
  options: {affinity?: TextDirection | null} = {},
): PathRef {
  const {affinity = 'forward'} = options
  const ref: PathRef = {
    current: path,
    affinity,
    unref() {
      const {current} = ref
      const pathRefs = editor.pathRefs
      pathRefs.delete(ref)
      ref.current = null
      return current
    },
  }

  const refs = editor.pathRefs
  refs.add(ref)
  return ref
}
