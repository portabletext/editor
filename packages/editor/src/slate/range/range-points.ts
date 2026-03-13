import type {PointEntry} from '../interfaces/point'
import type {Range} from '../interfaces/range'

export function* rangePoints(
  range: Range,
): Generator<PointEntry, void, undefined> {
  yield [range.anchor, 'anchor']
  yield [range.focus, 'focus']
}
