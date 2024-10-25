import type {
  ArrayDefinition,
  ArraySchemaType,
  BlockSchemaType,
  ObjectSchemaType,
  Path,
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  SpanSchemaType,
} from '@sanity/types'
import {
  Component,
  useEffect,
  type MutableRefObject,
  type PropsWithChildren,
} from 'react'
import {Subject} from 'rxjs'
import {createActor} from 'xstate'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorChange,
  EditorChanges,
  EditorSelection,
  PatchObservable,
  PortableTextMemberSchemaTypes,
} from '../types/editor'
import {debugWithName} from '../utils/debug'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import {SlateContainer} from './components/SlateContainer'
import {Synchronizer} from './components/Synchronizer'
import {EditorActorContext} from './editor-actor-context'
import {editorMachine, type EditorActor} from './editor-machine'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {PortableTextEditorReadOnlyContext} from './hooks/usePortableTextReadOnly'
import {defaultKeyGenerator} from './key-generator'
import type {Editor} from './use-editor'

const debug = debugWithName('component:PortableTextEditor')

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
      }) & {
    /**
     * Whether or not the editor should be in read-only mode
     */
    readOnly?: boolean

    /**
     * The current value of the portable text field
     */
    value?: PortableTextBlock[]

    /**
     * A ref to the editor instance
     */
    editorRef?: MutableRefObject<PortableTextEditor | null>
  }
>

/**
 * The main Portable Text Editor component.
 * @public
 */
export class PortableTextEditor extends Component<
  PortableTextEditorProps<Editor | undefined>
> {
  public static displayName = 'PortableTextEditor'
  /**
   * An observable of all the editor changes.
   */
  public change$: EditorChanges = new Subject()
  /**
   * A lookup table for all the relevant schema types for this portable text type.
   */
  public schemaTypes: PortableTextMemberSchemaTypes
  /**
   * The editor API (currently implemented with Slate).
   */
  private editable?: EditableAPI
  private editorActor: EditorActor

  constructor(props: PortableTextEditorProps) {
    super(props)

    if (props.editor) {
      this.editorActor = props.editor
      this.editorActor.start()
      this.schemaTypes = this.editorActor.getSnapshot().context.schema
    } else {
      if (!props.schemaType) {
        throw new Error('PortableTextEditor: missing "schemaType" property')
      }

      if (props.incomingPatches$) {
        console.warn(
          `The prop 'incomingPatches$' is deprecated and renamed to 'patches$'`,
        )
      }

      this.schemaTypes = getPortableTextMemberSchemaTypes(
        props.schemaType.hasOwnProperty('jsonType')
          ? props.schemaType
          : compileType(props.schemaType),
      )

      this.editorActor =
        props.editor ??
        createActor(editorMachine, {
          input: {
            keyGenerator: props.keyGenerator || defaultKeyGenerator,
            schema: this.schemaTypes,
          },
        })
      this.editorActor.start()
    }
  }

  componentDidUpdate(prevProps: PortableTextEditorProps) {
    // Set up the schema type lookup table again if the source schema type changes
    if (
      !this.props.editor &&
      !prevProps.editor &&
      this.props.schemaType !== prevProps.schemaType
    ) {
      this.schemaTypes = getPortableTextMemberSchemaTypes(
        this.props.schemaType.hasOwnProperty('jsonType')
          ? this.props.schemaType
          : compileType(this.props.schemaType),
      )

      this.editorActor.send({
        type: 'update schema',
        schema: this.schemaTypes,
      })
    }

    if (this.props.editorRef !== prevProps.editorRef && this.props.editorRef) {
      this.props.editorRef.current = this
    }
  }

  public setEditable = (editable: EditableAPI) => {
    this.editable = {...this.editable, ...editable}
  }

  private getValue = () => {
    if (this.editable) {
      return this.editable.getValue()
    }

    return undefined
  }

  render() {
    const maxBlocks = !this.props.editor
      ? typeof this.props.maxBlocks === 'undefined'
        ? undefined
        : Number.parseInt(this.props.maxBlocks.toString(), 10) || undefined
      : undefined

    const readOnly = Boolean(this.props.readOnly)
    const legacyPatches = !this.props.editor
      ? (this.props.incomingPatches$ ?? this.props.patches$)
      : undefined

    return (
      <>
        {legacyPatches ? (
          <RoutePatchesObservableToEditorActor
            editorActor={this.editorActor}
            patches$={legacyPatches}
          />
        ) : null}
        <EditorActorContext.Provider value={this.editorActor}>
          <SlateContainer
            editorActor={this.editorActor}
            maxBlocks={maxBlocks}
            portableTextEditor={this}
            readOnly={readOnly}
          >
            <PortableTextEditorContext.Provider value={this}>
              <PortableTextEditorReadOnlyContext.Provider value={readOnly}>
                <PortableTextEditorSelectionProvider
                  editorActor={this.editorActor}
                >
                  <Synchronizer
                    editorActor={this.editorActor}
                    getValue={this.getValue}
                    onChange={(change) => {
                      if (!this.props.editor) {
                        this.props.onChange(change)
                      }
                      /**
                       * For backwards compatibility, we relay all changes to the
                       * `change$` Subject as well.
                       */
                      this.change$.next(change)
                    }}
                    value={this.props.value}
                  />
                  {this.props.children}
                </PortableTextEditorSelectionProvider>
              </PortableTextEditorReadOnlyContext.Provider>
            </PortableTextEditorContext.Provider>
          </SlateContainer>
        </EditorActorContext.Provider>
      </>
    )
  }

  // Static API methods
  static activeAnnotations = (
    editor: PortableTextEditor,
  ): PortableTextObject[] => {
    return editor && editor.editable ? editor.editable.activeAnnotations() : []
  }
  static isAnnotationActive = (
    editor: PortableTextEditor,
    annotationType: PortableTextObject['_type'],
  ): boolean => {
    return editor && editor.editable
      ? editor.editable.isAnnotationActive(annotationType)
      : false
  }
  static addAnnotation = (
    editor: PortableTextEditor,
    type: ObjectSchemaType,
    value?: {[prop: string]: unknown},
  ):
    | {
        /**
         * @deprecated An annotation may be applied to multiple blocks, resulting
         * in multiple `markDef`'s being created. Use `markDefPaths` instead.
         */
        markDefPath: Path
        markDefPaths: Array<Path>
        /**
         * @deprecated Does not return anything meaningful since an annotation
         * can span multiple blocks and spans. If references the span closest
         * to the focus point of the selection.
         */
        spanPath: Path
      }
    | undefined => editor.editable?.addAnnotation(type, value)
  static blur = (editor: PortableTextEditor): void => {
    debug('Host blurred')
    editor.editable?.blur()
  }
  static delete = (
    editor: PortableTextEditor,
    selection: EditorSelection,
    options?: EditableAPIDeleteOptions,
  ) => editor.editable?.delete(selection, options)
  static findDOMNode = (
    editor: PortableTextEditor,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.findDOMNode(element)
  }
  static findByPath = (editor: PortableTextEditor, path: Path) => {
    return editor.editable?.findByPath(path) || []
  }
  static focus = (editor: PortableTextEditor): void => {
    debug('Host requesting focus')
    editor.editable?.focus()
  }
  static focusBlock = (editor: PortableTextEditor) => {
    return editor.editable?.focusBlock()
  }
  static focusChild = (
    editor: PortableTextEditor,
  ): PortableTextChild | undefined => {
    return editor.editable?.focusChild()
  }
  static getSelection = (editor: PortableTextEditor) => {
    return editor.editable ? editor.editable.getSelection() : null
  }
  static getValue = (editor: PortableTextEditor) => {
    return editor.editable?.getValue()
  }
  static hasBlockStyle = (editor: PortableTextEditor, blockStyle: string) => {
    return editor.editable?.hasBlockStyle(blockStyle)
  }
  static hasListStyle = (editor: PortableTextEditor, listStyle: string) => {
    return editor.editable?.hasListStyle(listStyle)
  }
  static isCollapsedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isCollapsedSelection()
  static isExpandedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isExpandedSelection()
  static isMarkActive = (editor: PortableTextEditor, mark: string) =>
    editor.editable?.isMarkActive(mark)
  static insertChild = (
    editor: PortableTextEditor,
    type: SpanSchemaType | ObjectSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    debug(`Host inserting child`)
    return editor.editable?.insertChild(type, value)
  }
  static insertBlock = (
    editor: PortableTextEditor,
    type: BlockSchemaType | ObjectSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    return editor.editable?.insertBlock(type, value)
  }
  static insertBreak = (editor: PortableTextEditor): void => {
    return editor.editable?.insertBreak()
  }
  static isVoid = (
    editor: PortableTextEditor,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.isVoid(element)
  }
  static isObjectPath = (_editor: PortableTextEditor, path: Path): boolean => {
    if (!path || !Array.isArray(path)) return false
    const isChildObjectEditPath = path.length > 3 && path[1] === 'children'
    const isBlockObjectEditPath = path.length > 1 && path[1] !== 'children'
    return isBlockObjectEditPath || isChildObjectEditPath
  }
  static marks = (editor: PortableTextEditor) => {
    return editor.editable?.marks()
  }
  static select = (
    editor: PortableTextEditor,
    selection: EditorSelection | null,
  ) => {
    debug(`Host setting selection`, selection)
    editor.editable?.select(selection)
  }
  static removeAnnotation = (
    editor: PortableTextEditor,
    type: ObjectSchemaType,
  ) => editor.editable?.removeAnnotation(type)
  static toggleBlockStyle = (
    editor: PortableTextEditor,
    blockStyle: string,
  ) => {
    debug(`Host is toggling block style`)
    return editor.editable?.toggleBlockStyle(blockStyle)
  }
  static toggleList = (editor: PortableTextEditor, listStyle: string): void => {
    return editor.editable?.toggleList(listStyle)
  }
  static toggleMark = (editor: PortableTextEditor, mark: string): void => {
    debug(`Host toggling mark`, mark)
    editor.editable?.toggleMark(mark)
  }
  static getFragment = (
    editor: PortableTextEditor,
  ): PortableTextBlock[] | undefined => {
    debug(`Host getting fragment`)
    return editor.editable?.getFragment()
  }
  static undo = (editor: PortableTextEditor): void => {
    debug('Host undoing')
    editor.editable?.undo()
  }
  static redo = (editor: PortableTextEditor): void => {
    debug('Host redoing')
    editor.editable?.redo()
  }
  static isSelectionsOverlapping = (
    editor: PortableTextEditor,
    selectionA: EditorSelection,
    selectionB: EditorSelection,
  ) => {
    return editor.editable?.isSelectionsOverlapping(selectionA, selectionB)
  }
}

function RoutePatchesObservableToEditorActor(props: {
  editorActor: EditorActor
  patches$: PatchObservable
}) {
  useEffect(() => {
    const subscription = props.patches$.subscribe((payload) => {
      props.editorActor.send({
        type: 'patches',
        ...payload,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorActor, props.patches$])

  return null
}
