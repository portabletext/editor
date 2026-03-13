import type {Location, Range} from '../interfaces'
import type {Editor} from '../interfaces/editor'
import {Range as RangeUtils} from '../interfaces/range'
import {end} from './end'
import {start} from './start'

export function range(editor: Editor, at: Location, to?: Location): Range {
  if (RangeUtils.isRange(at) && !to) {
    return at
  }

  const rangeStart = start(editor, at)
  const rangeEnd = end(editor, to || at)
  return {anchor: rangeStart, focus: rangeEnd}
}
