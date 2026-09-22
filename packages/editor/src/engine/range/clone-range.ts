import type {Path} from '../../types/paths'
import type {Point} from '../interfaces/point'
import type {Range} from '../interfaces/range'

function clonePath(path: Path): Path {
  return path.map((segment) => {
    if (Array.isArray(segment)) {
      return [...segment]
    }

    return typeof segment === 'object' ? {...segment} : segment
  })
}

function clonePoint(point: Point): Point {
  return {...point, path: clonePath(point.path)}
}

export function cloneRange<TRange extends Range>(range: TRange): TRange {
  return {
    ...range,
    anchor: clonePoint(range.anchor),
    focus: clonePoint(range.focus),
  }
}
