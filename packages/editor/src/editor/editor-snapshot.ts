import type {PortableTextBlock} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorSchema} from './editor-schema'

/**
 * @public
 */
export type EditorContext = {
  converters: Array<Converter>
  editableTypes: Set<string>
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

  const context = {
    converters,
    editableTypes: editor.editableTypes,
    keyGenerator,
    readOnly,
    schema,
    selection,
    value: editor.children,
  } satisfies EditorContext

  return {
    blockIndexMap: editor.blockIndexMap,
    context,
    decoratorState: editor.decoratorState,
  } satisfies EditorSnapshot
}
