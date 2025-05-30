import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextBlock} from '@sanity/types'
import {compileSchemaDefinition, defineSchema} from '../editor/editor-schema'
import {getKeyedSelection} from '../editor/indexed-selection'
import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'

export function getSelectionFocusText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value) {
    return undefined
  }

  const keyedSelection = getKeyedSelection(
    compileSchemaDefinition(defineSchema({})),
    value,
    selection,
  )

  if (!keyedSelection) {
    return undefined
  }

  let text: string | undefined

  for (const block of value) {
    if (isPortableTextBlock(block)) {
      if (
        isKeyedSegment(keyedSelection.focus.path[0]) &&
        block._key === keyedSelection.focus.path[0]._key
      ) {
        for (const child of block.children) {
          if (isPortableTextSpan(child)) {
            if (
              isKeyedSegment(keyedSelection.focus.path[2]) &&
              child._key === keyedSelection.focus.path[2]._key
            ) {
              text = child.text
              break
            }
          }
        }
      }
    }
  }

  return text
}
