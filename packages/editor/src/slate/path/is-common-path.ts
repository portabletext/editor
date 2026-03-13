import type {Path} from '../interfaces/path'
import {comparePaths} from './compare-paths'

export function isCommonPath(path: Path, another: Path): boolean {
  return path.length <= another.length && comparePaths(path, another) === 0
}
