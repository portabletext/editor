import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from '../converters/converter.types'
import type {EventPosition} from '../internal-utils/event-position'
import {slateRangeToSelection} from '../internal-utils/slate-utils'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import type {HasTag} from './editor-machine'
import type {EditorSchema} from './editor-schema'
import {getActiveAnnotations} from './get-active-annotations'
import {getActiveDecorators} from './get-active-decorators'

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
  /**
   * @beta
   * Do not rely on this externally
   */
  beta: {
    activeAnnotations: Array<string>
    activeDecorators: Array<string>
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
    context,
    beta: {
      activeAnnotations: getActiveAnnotations({
        markState: editor.markState,
        schema,
      }),
      activeDecorators: getActiveDecorators({
        decoratorState: editor.decoratorState,
        markState: editor.markState,
        schema,
      }),
      hasTag,
      internalDrag,
    },
  } satisfies EditorSnapshot
}
