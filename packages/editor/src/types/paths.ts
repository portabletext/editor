import {isKeyedSegment} from '../utils'

export type BlockPath = [{_key: string}] | [number]

export function isKeyedPath(path: BlockPath): path is [{_key: string}] {
  return isKeyedSegment(path[0])
}
