import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import {isKeyedSegment} from '../utils'

export type BlockPath = IndexedBlockPath | KeyedBlockPath

export type IndexedBlockPath = [number]

export function isIndexedBlockPath(path: BlockPath): path is IndexedBlockPath {
  return typeof path.at(0) === 'number'
}

export type KeyedBlockPath = [KeyedSegment]

export function isKeyedBlockPath(path: BlockPath): path is KeyedBlockPath {
  return isKeyedSegment(path.at(0))
}

export function getKeyedBlockPath(
  value: Array<PortableTextBlock>,
  path: BlockPath,
): KeyedBlockPath | undefined {
  if (isKeyedBlockPath(path)) {
    return path
  }

  const blockIndex = path.at(0)

  if (blockIndex === undefined) {
    return undefined
  }

  const block = value.at(blockIndex)

  if (!block) {
    return undefined
  }

  return [{_key: block._key}]
}

export type ChildPath = IndexedChildPath | KeyedChildPath

export type IndexedChildPath = [number, number]

export type KeyedChildPath = [KeyedSegment, 'children', KeyedSegment]
