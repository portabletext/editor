import type {PortableTextBlock} from '@sanity/types'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
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
