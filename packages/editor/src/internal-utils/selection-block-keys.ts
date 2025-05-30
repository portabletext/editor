import type {PortableTextBlock} from '@sanity/types'
import {compileSchemaDefinition, defineSchema} from '../editor/editor-schema'
import {getKeyedSelection} from '../editor/keyed-selection'
import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'

export function getSelectionBlockKeys(
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
) {
  const keyedSelection = getKeyedSelection(
    compileSchemaDefinition(defineSchema({})),
    value,
    selection,
  )

  if (!keyedSelection) {
    return undefined
  }

  if (
    !isKeyedSegment(keyedSelection.anchor.path[0]) ||
    !isKeyedSegment(keyedSelection.focus.path[0])
  ) {
    return undefined
  }

  return {
    anchor: keyedSelection.anchor.path[0]._key,
    focus: keyedSelection.focus.path[0]._key,
  }
}
