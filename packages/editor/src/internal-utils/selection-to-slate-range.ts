import {isPortableTextTextBlock, type PortableTextBlock} from '@sanity/types'
import type {Range} from 'slate'
import type {EditorSchema} from '../editor/define-schema'
import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'

export function selectionToSlateRange({
  schema,
  value,
  selection,
}: {
  schema: EditorSchema
  value: Array<PortableTextBlock>
  selection: EditorSelection
}): Range | undefined {
  if (!selection) {
    return undefined
  }

  const anchorBlockKey = isKeyedSegment(selection.anchor.path[0])
    ? selection.anchor.path[0]._key
    : undefined
  const focusBlockKey = isKeyedSegment(selection.focus.path[0])
    ? selection.focus.path[0]._key
    : undefined

  if (!anchorBlockKey || !focusBlockKey) {
    return undefined
  }

  const anchorChildKey = isKeyedSegment(selection.anchor.path[2])
    ? selection.anchor.path[2]._key
    : undefined
  const focusChildKey = isKeyedSegment(selection.focus.path[2])
    ? selection.focus.path[2]._key
    : undefined

  const range: Range = {
    anchor: {
      path: [],
      offset: selection.anchor.offset,
    },
    focus: {
      path: [],
      offset: selection.focus.offset,
    },
  }

  for (let blockIndex = 0; blockIndex < value.length; blockIndex++) {
    const block = value.at(blockIndex)

    if (!block) {
      continue
    }

    if (block._key === anchorBlockKey && block._key === focusBlockKey) {
      range.anchor.path.push(blockIndex)
      range.focus.path.push(blockIndex)

      if (!anchorChildKey || !focusChildKey) {
        if (isPortableTextTextBlock(block)) {
          range.anchor.path = []
          range.focus.path = []
        }

        break
      }

      if (block._type === schema.block.name && isPortableTextTextBlock(block)) {
        for (
          let childIndex = 0;
          childIndex < block.children.length;
          childIndex++
        ) {
          const child = block.children.at(childIndex)

          if (!child) {
            continue
          }

          if (child._key === anchorChildKey && child._key === focusChildKey) {
            range.anchor.path.push(childIndex)
            range.focus.path.push(childIndex)

            break
          }

          if (child._key === anchorChildKey) {
            range.anchor.path.push(childIndex)

            break
          }

          if (child._key === focusChildKey) {
            range.focus.path.push(childIndex)

            break
          }
        }
      } else {
        range.anchor.path.push(0)
        range.focus.path.push(0)
      }

      if (
        isPortableTextTextBlock(block) &&
        (range.anchor.path.length < 2 || range.focus.path.length < 2)
      ) {
        range.anchor.path = []
        range.focus.path = []
      }

      break
    }

    if (block._key === anchorBlockKey) {
      range.anchor.path.push(blockIndex)

      if (!anchorChildKey) {
        continue
      }

      if (block._type === schema.block.name && isPortableTextTextBlock(block)) {
        for (
          let childIndex = 0;
          childIndex < block.children.length;
          childIndex++
        ) {
          const child = block.children.at(childIndex)

          if (!child) {
            continue
          }

          if (child._key === anchorChildKey) {
            range.anchor.path.push(childIndex)

            break
          }
        }
      }

      continue
    }

    if (block._key === focusBlockKey) {
      range.focus.path.push(blockIndex)

      if (!focusBlockKey) {
        break
      }

      if (block._type === schema.block.name && isPortableTextTextBlock(block)) {
        for (
          let childIndex = 0;
          childIndex < block.children.length;
          childIndex++
        ) {
          const child = block.children.at(childIndex)

          if (!child) {
            continue
          }

          if (child._key === focusChildKey) {
            range.focus.path.push(childIndex)

            break
          }
        }
      }

      break
    }
  }

  if (range.anchor.path.length === 0 || range.focus.path.length === 0) {
    return undefined
  }

  return range
}
