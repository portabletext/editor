import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import type {MutableRefObject, PropsWithChildren} from 'react'
import type {
  EditableAPI,
  EditorChange,
  EditorChanges,
  PatchObservable,
  PortableTextMemberSchemaTypes,
} from '../types/editor'
import type {SlateEditor} from './create-slate-editor'
import type {EditorActor} from './editor-machine'
import type {Editor} from './use-editor'

/**
 * The editor instance returned by usePortableTextEditor(), as well as if you use the `ref` prop on the PortableTextEditor component.
 * @public
 */
export interface PortableTextEditorInstance {
  /**
   * An observable of all the editor changes.
   */
  change$: EditorChanges
  /**
   * A lookup table for all the relevant schema types for this portable text type.
   */
  schemaTypes: PortableTextMemberSchemaTypes
  /**
   * The editor API (currently implemented with Slate).
   */
  editable?: EditableAPI
  editorActor: EditorActor
  slateEditor: SlateEditor

  setEditable: (editable: EditableAPI) => void
  getValue: () => PortableTextBlock[] | undefined
}

/**
 * Props for the PortableTextEditor component
 *
 * @public
 */
export type PortableTextEditorProps<
  TEditor extends Editor | undefined = undefined,
> = PropsWithChildren<
  (TEditor extends Editor
    ? {
        /**
         * @alpha
         */
        editor: TEditor
      }
    : {
        editor?: undefined

        /**
         * Function that gets called when the editor changes the value
         */
        onChange: (change: EditorChange) => void

        /**
         * Schema type for the portable text field
         */
        schemaType: ArraySchemaType<PortableTextBlock> | ArrayDefinition

        /**
         * Maximum number of blocks to allow within the editor
         */
        maxBlocks?: number | string

        /**
         * Function used to generate keys for array items (`_key`)
         */
        keyGenerator?: () => string

        /**
         * Observable of local and remote patches for the edited value.
         */
        patches$?: PatchObservable

        /**
         * Backward compatibility (renamed to patches$).
         */
        incomingPatches$?: PatchObservable

        /**
         * Whether or not the editor should be in read-only mode
         */
        readOnly?: boolean
      }) & {
    /**
     * The current value of the portable text field
     */
    value?: PortableTextBlock[]

    /**
     * A ref to the editor instance
     */
    editorRef?: MutableRefObject<PortableTextEditorInstance | null>
  }
>
