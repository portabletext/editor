import type {
  FieldDefinition,
  OfDefinition,
  PortableTextBlock,
} from '@portabletext/schema'
import type {Converter} from '../converters/converter.types'
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
  /**
   * Map of registered editable containers keyed by their scoped type name
   * (the '.'-joined type chain from root, e.g. `'code-block'`,
   * `'callout.code-block'`, `'callout.code-block.block'`).
   *
   * Used by container-aware selectors and traversal utilities to resolve
   * which array field on a container node holds its editable children.
   *
   * @alpha
   */
  containers: ReadonlyMap<
    string,
    {
      field: FieldDefinition & {
        type: 'array'
        of: ReadonlyArray<OfDefinition>
      }
    }
  >
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
    containers: editor.containers,
    converters,
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
