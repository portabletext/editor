import type {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import type {RangeRef} from '../interfaces/range-ref'
import type {RangeDirection} from '../types/types'

export function rangeRef(
  editor: Editor,
  range: Range,
  options: {affinity?: RangeDirection | null} = {},
): RangeRef {
  const {affinity = 'forward'} = options
  const ref: RangeRef = {
    current: range,
    affinity,
    unref() {
      const {current} = ref
      const rangeRefs = editor.rangeRefs
      rangeRefs.delete(ref)
      ref.current = null
      return current
    },
  }

  const refs = editor.rangeRefs
  refs.add(ref)
  return ref
}
