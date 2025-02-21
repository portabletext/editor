import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from '../converters/converter.types'
import {toPortableTextRange} from '../internal-utils/ranges'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './define-schema'
import type {HasTag} from './editor-machine'
import {getActiveDecorators} from './get-active-decorators'

/**
 * @public
 */
export type EditorContext = {
  activeDecorators: Array<string>
  converters: Array<Converter>
  keyGenerator: () => string
  schema: EditorSchema
  selection: EditorSelection
  value: Array<PortableTextBlock>
}

/**
 * @public
 */
export type EditorSnapshot = {
  context: EditorContext
  /**
   * @beta
   * Do not rely on this externally
   */
  beta: {
    hasTag: HasTag
  }
}

export function createEditorSnapshot({
  converters,
  editor,
  keyGenerator,
  schema,
  hasTag,
}: {
  converters: Array<Converter>
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  schema: EditorSchema
  hasTag: HasTag
}) {
  const value = fromSlateValue(
    editor.children,
    schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(editor),
  )
  const selection = toPortableTextRange(value, editor.selection, schema)

  const context = {
    activeDecorators: getActiveDecorators({
      schema,
      slateEditorInstance: editor,
    }),
    converters,
    keyGenerator,
    schema,
    selection,
    value,
  } satisfies EditorContext

  return {
    context,
    beta: {
      hasTag,
    },
  } satisfies EditorSnapshot
}
