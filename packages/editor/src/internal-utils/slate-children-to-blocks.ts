import type {PortableTextBlock} from '@sanity/types'
import type {EditorSchema} from '../editor/define-schema'
import {PortableTextSlateEditor} from '../types/editor'

let lastChangeCount: number | undefined
let lastBlocks: Array<PortableTextBlock> | undefined

export function slateChildrenToBlocks(
  schema: EditorSchema,
  editor: PortableTextSlateEditor,
): Array<PortableTextBlock> {
  if (lastChangeCount === editor.changeCount && lastBlocks) {
    return lastBlocks
  }

  const value = editor.children
  const blocks: Array<PortableTextBlock> = new Array(value.length)

  for (let blockIndex = 0; blockIndex < value.length; blockIndex++) {
    const descendant = value[blockIndex]

    if (descendant._type !== schema.block.name) {
      blocks[blockIndex] = {
        _key: descendant._key,
        _type: descendant._type,
        ...('value' in descendant && typeof descendant.value === 'object'
          ? descendant.value
          : {}),
      }
      continue
    }

    const children = 'children' in descendant ? descendant.children : []
    const processedChildren = new Array(children.length)

    for (let childIndex = 0; childIndex < children.length; childIndex++) {
      const child = children[childIndex]
      processedChildren[childIndex] =
        child._type === schema.span.name
          ? child
          : {
              _key: child._key,
              _type: child._type,
              ...('value' in child && typeof child.value === 'object'
                ? child.value
                : {}),
            }
    }

    blocks[blockIndex] = {
      ...descendant,
      children: processedChildren,
    }
  }

  lastChangeCount = editor.changeCount
  lastBlocks = blocks

  return blocks
}
