import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from '../converters/converter.types'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'

/**
 * @public
 */
export type EditorContext = {
  converters: Array<Converter>
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
}

/**
 * @public
 */
export type EditorSnapshot = {
  context: EditorContext
  blockIndexMap: Map<string, number>
  /**
   * @beta
   * Subject to change
   */
  decoratorState: Record<string, boolean | undefined>
}

export function createEditorSnapshot({
  converters,
  editor,
  keyGenerator,
  readOnly,
  schema,
}: {
  converters: Array<Converter>
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
}) {
  const selection = editor.selection
    ? slateRangeToSelection({
        schema,
        editor,
        range: editor.selection,
      })
    : null

  const context = {
    converters,
    keyGenerator,
    readOnly,
    schema,
    selection,
    value: editor.value,
  } satisfies EditorContext

  return {
    blockIndexMap: editor.blockIndexMap,
    context,
    decoratorState: editor.decoratorState,
  } satisfies EditorSnapshot
}
