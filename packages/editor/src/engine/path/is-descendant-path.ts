import type {Path} from '../interfaces/path'
import {isAncestorPath} from './is-ancestor-path'

export function isDescendantPath(path: Path, another: Path): boolean {
  return isAncestorPath(another, path)
}
