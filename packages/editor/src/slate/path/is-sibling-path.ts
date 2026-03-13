import type {Path} from '../interfaces/path'
import {pathEquals} from './path-equals'

export function isSiblingPath(path: Path, another: Path): boolean {
  if (path.length !== another.length) {
    return false
  }

  const as = path.slice(0, -1)
  const bs = another.slice(0, -1)
  const al = path[path.length - 1]
  const bl = another[another.length - 1]
  return al !== bl && pathEquals(as, bs)
}
