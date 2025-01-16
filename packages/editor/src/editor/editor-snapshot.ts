import type {PortableTextBlock} from '@sanity/types'
import {toPortableTextRange} from '../internal-utils/ranges'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './define-schema'
import {getActiveDecorators} from './get-active-decorators'

/**
 * @public
 */
export type EditorContext = {
  activeDecorators: Array<string>
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
}

export function createEditorSnapshot({
  editor,
  keyGenerator,
  schema,
}: {
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  schema: EditorSchema
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
    keyGenerator,
    schema,
    selection,
    value,
  } satisfies EditorContext

  return {
    context,
  } satisfies EditorSnapshot
}
