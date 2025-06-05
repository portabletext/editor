import type {PortableTextBlock} from '@sanity/types'
import {compileSchemaDefinition, defineSchema} from '../editor/editor-schema'
import type {EditorSelection} from '../types/editor'
import {sliceBlocks} from '../utils/util.slice-blocks'
import {getTersePt} from './terse-pt'

export function getSelectionText(
  value: Array<PortableTextBlock> | undefined,
  selection: EditorSelection,
) {
  if (!value || !selection) {
    return []
  }

  const slice = sliceBlocks({
    context: {schema: compileSchemaDefinition(defineSchema({})), selection},
    blocks: value,
  })

  return getTersePt(slice)
}
