import type {PortableTextBlock} from '@sanity/types'
import type {Converter} from '../converters/converter.types'
import type {EventPosition} from '../internal-utils/event-position'
import type {PortableTextSlateEditor} from '../types/editor'
import type {HasTag} from './editor-machine'
import type {EditorSchema} from './editor-schema'
import type {EditorSelection} from './editor-selection'
import {slateRangeToEditorSelection} from './editor-selection-from-slate-range'
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
  selectionType,
  internalDrag,
}: {
  converters: Array<Converter>
  editor: PortableTextSlateEditor
  keyGenerator: () => string
  readOnly: boolean
  schema: EditorSchema
  selectionType: 'indexed' | 'keyed'
  hasTag: HasTag
  internalDrag:
    | {
        origin: Pick<EventPosition, 'selection'>
      }
    | undefined
}) {
  const context = {
    converters,
    keyGenerator,
    readOnly,
    schema,
    selection: slateRangeToEditorSelection({
      type: selectionType,
      schema,
      editor,
      range: editor.selection,
    }),
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
