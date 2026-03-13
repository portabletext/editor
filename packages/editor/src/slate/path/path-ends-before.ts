import type {Path} from '../interfaces/path'
import {pathEquals} from './path-equals'

export function pathEndsBefore(path: Path, another: Path): boolean {
  const i = path.length - 1
  const as = path.slice(0, i)
  const bs = another.slice(0, i)
  const av = path[i]!
  const bv = another[i]!
  return pathEquals(as, bs) && av < bv
}
