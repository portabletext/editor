import type {Point, PointRef} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import type {TextDirection} from '../types/types'

export function pointRef(
  editor: Editor,
  point: Point,
  options: {affinity?: TextDirection | null} = {},
): PointRef {
  const {affinity = 'forward'} = options
  const ref: PointRef = {
    current: point,
    affinity,
    unref() {
      const {current} = ref
      const pointRefs = editor.pointRefs
      pointRefs.delete(ref)
      ref.current = null
      return current
    },
  }

  const refs = editor.pointRefs
  refs.add(ref)
  return ref
}
