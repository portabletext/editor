import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'

export function getEditorSelection(
  blocks: Array<PortableTextBlock> | undefined,
): EditorSelection {
  if (!blocks) {
    throw new Error('No value found')
  }

  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined
  const firstBlock = blocks[0]
  const lastBlock = blocks[blocks.length - 1]

  if (isPortableTextBlock(firstBlock)) {
    anchor = {
      path: [
        {_key: firstBlock._key},
        'children',
        {_key: firstBlock.children[0]._key},
      ],
      offset: 0,
    }
  } else {
    anchor = {
      path: [{_key: firstBlock._key}],
      offset: 0,
    }
  }

  const lastChild = isPortableTextBlock(lastBlock)
    ? lastBlock.children[lastBlock.children.length - 1]
    : undefined
  if (
    isPortableTextBlock(lastBlock) &&
    lastChild &&
    isPortableTextSpan(lastChild)
  ) {
    focus = {
      path: [{_key: lastBlock._key}, 'children', {_key: lastChild._key}],
      offset: lastChild.text.length ?? 0,
    }
  } else {
    focus = {
      path: [{_key: lastBlock._key}],
      offset: 0,
    }
  }

  if (!anchor || !focus) {
    throw new Error('No selection found')
  }

  return {
    anchor,
    focus,
  }
}
