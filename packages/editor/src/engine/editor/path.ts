import type {Location} from '../interfaces/location'
import type {Path} from '../interfaces/path'
import {commonPath} from '../path/common-path'
import {isPoint} from '../point/is-point'
import {isRange} from '../range/is-range'

export function path(at: Location): Path {
  if (isRange(at)) {
    return commonPath(at.anchor.path, at.focus.path)
  }

  if (isPoint(at)) {
    return at.path
  }

  return at
}
