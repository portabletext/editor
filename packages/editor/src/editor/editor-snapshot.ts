import type {PortableTextBlock} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
import type {BlockMap} from '../internal-utils/block-map'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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
  blockMap: BlockMap
  /** @deprecated Use `blockMap` instead */
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
    blockMap: editor.blockMap,
    blockIndexMap: editor.blockIndexMap,
    context,
    decoratorState: editor.decoratorState,
  } satisfies EditorSnapshot
}
