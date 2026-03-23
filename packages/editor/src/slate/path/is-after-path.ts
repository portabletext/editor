import type {Path} from '../interfaces/path'
import {comparePaths} from './compare-paths'

export function isAfterPath(path: Path, another: Path): boolean {
  return comparePaths(path, another) === 1
}
