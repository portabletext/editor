import type {Editor} from '../interfaces/editor'
import type {Location} from '../interfaces/location'
import type {Range} from '../interfaces/range'
import {isRange} from '../range/is-range'
import {end} from './end'
import {start} from './start'

export function range(editor: Editor, at: Location, to?: Location): Range {
  if (isRange(at) && !to) {
    return at
  }

  const rangeStart = start(editor, at)
  const rangeEnd = end(editor, to || at)
  return {anchor: rangeStart, focus: rangeEnd}
}
