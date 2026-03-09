import type {PortableTextBlock} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
import type {BlockPathMap} from '../internal-utils/block-path-map'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorSchema} from './editor-schema'

/**
 * @public
 */
export type EditorContext = {
  containers: Set<string>
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
  blockPathMap: BlockPathMap
  /**
   * @beta
   * Subject to change
   */
  decoratorState: Record<string, boolean | undefined>
}

export function createEditorSnapshot({
  containers,
  converters,
  editor,
  keyGenerator,
  readOnly,
  schema,
}: {
  containers?: Set<string>
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
    containers: containers ?? new Set<string>(),
    converters,
    keyGenerator,
    readOnly,
    schema,
    selection,
    value: editor.children as Array<PortableTextBlock>,
  } satisfies EditorContext

  return {
    blockIndexMap: editor.blockIndexMap,
    blockPathMap: editor.blockPathMap,
    context,
    decoratorState: editor.decoratorState,
  } satisfies EditorSnapshot
}
