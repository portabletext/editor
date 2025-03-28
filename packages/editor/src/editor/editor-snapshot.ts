import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from '../converters/converter.types'
import type {EventPosition} from '../internal-utils/event-position'
import {toPortableTextRange} from '../internal-utils/ranges'
import {slateChildrenToBlocks} from '../internal-utils/slate-children-to-blocks'
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
  /**
   * @beta
   * Do not rely on this externally
   */
  beta: {
    hasTag: HasTag
    internalDrag:
      | {
          origin: Pick<EventPosition, 'selection'>
        }
      | undefined
  }
}

export function createEditorSnapshot({
  converters,
  editor,
  keyGenerator,
  readOnly,
  schema,
  hasTag,
  internalDrag,
}: {
  converters: Array<Converter>
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
  hasTag: HasTag
  internalDrag:
    | {
        origin: Pick<EventPosition, 'selection'>
      }
    | undefined
}) {
  const value = slateChildrenToBlocks(schema, editor.children)
  const selection = toPortableTextRange(value, editor.selection, schema)

  const context = {
    activeDecorators: getActiveDecorators({
      schema,
      slateEditorInstance: editor,
    }),
    converters,
    keyGenerator,
    readOnly,
    schema,
    selection,
    value,
  } satisfies EditorContext

  return {
    context,
    beta: {
      hasTag,
      internalDrag,
    },
  } satisfies EditorSnapshot
}
