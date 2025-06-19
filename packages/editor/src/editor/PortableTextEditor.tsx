import type {
  ArrayDefinition,
  ArraySchemaType,
  Path,
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
} from '@sanity/types'
import {
  Component,
  useEffect,
  type MutableRefObject,
  type PropsWithChildren,
} from 'react'
import {Subject} from 'rxjs'
import {Slate} from 'slate-react'
import {debugWithName} from '../internal-utils/debug'
import {stopActor} from '../internal-utils/stop-actor'
import type {AddedAnnotationPaths} from '../operations/behavior.operation.annotation.add'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorChange,
  EditorChanges,
  EditorSelection,
  PatchObservable,
  PortableTextMemberSchemaTypes,
} from '../types/editor'
import {createInternalEditor, type InternalEditor} from './create-editor'
import {EditorActorContext} from './editor-actor-context'
import type {EditorActor} from './editor-machine'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import type {MutationActor} from './mutation-machine'
import {RelayActorContext} from './relay-actor-context'
import type {RelayActor} from './relay-machine'
import {eventToChange} from './route-events-to-changes'
import type {SyncActor} from './sync-machine'

const debug = debugWithName('component:PortableTextEditor')

/**
 * Props for the PortableTextEditor component
 *
 * @public
 * @deprecated Use `EditorProvider` instead
 */
export type PortableTextEditorProps<
  TEditor extends InternalEditor | undefined = undefined,
> = PropsWithChildren<
  TEditor extends InternalEditor
    ? {
        /**
         * @internal
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
 * @deprecated Use `EditorProvider` instead
 */
export class PortableTextEditor extends Component<
  PortableTextEditorProps<InternalEditor | undefined>
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
   * The editor instance
   */
  private editor: InternalEditor
  /*
   * The editor API (currently implemented with Slate).
   */
  private editable: EditableAPI

  private actors?: {
    editorActor: EditorActor
    mutationActor: MutationActor
    relayActor: RelayActor
    syncActor: SyncActor
  }

  private subscriptions: Array<() => () => void> = []
  private unsubscribers: Array<() => void> = []

  constructor(props: PortableTextEditorProps) {
    super(props)

    if (props.editor) {
      this.editor = props.editor as InternalEditor
      this.schemaTypes = this.editor._internal.editorActor
        .getSnapshot()
        .context.getLegacySchema()
    } else {
      const {actors, editor, subscriptions} = createInternalEditor({
        initialValue: props.value,
        keyGenerator: props.keyGenerator,
        maxBlocks:
          props.maxBlocks === undefined
            ? undefined
            : Number.parseInt(props.maxBlocks.toString(), 10),
        readOnly: props.readOnly,
        schema: props.schemaType,
      })

      this.subscriptions = subscriptions
      this.actors = actors

      this.editor = editor
      this.schemaTypes = actors.editorActor
        .getSnapshot()
        .context.getLegacySchema()
    }

    this.editable = this.editor._internal.editable
  }

  componentDidMount(): void {
    if (!this.actors) {
      return
    }

    for (const subscription of this.subscriptions) {
      this.unsubscribers.push(subscription())
    }

    const relayActorSubscription = this.actors.relayActor.on('*', (event) => {
      const change = eventToChange(event)

      if (!change) {
        return
      }

      if (!this.props.editor) {
        this.props.onChange(change)
      }

      this.change$.next(change)
    })

    this.unsubscribers.push(relayActorSubscription.unsubscribe)

    this.actors.editorActor.start()
    this.actors.mutationActor.start()
    this.actors.relayActor.start()
    this.actors.syncActor.start()
  }

  componentDidUpdate(prevProps: PortableTextEditorProps) {
    // Set up the schema type lookup table again if the source schema type changes
    if (
      !this.props.editor &&
      !prevProps.editor &&
      this.props.schemaType !== prevProps.schemaType
    ) {
      console.warn('Updating schema type is no longer supported')
    }

    if (!this.props.editor && !prevProps.editor) {
      if (this.props.readOnly !== prevProps.readOnly) {
        this.editor._internal.editorActor.send({
          type: 'update readOnly',
          readOnly: this.props.readOnly ?? false,
        })
      }

      if (this.props.maxBlocks !== prevProps.maxBlocks) {
        this.editor._internal.editorActor.send({
          type: 'update maxBlocks',
          maxBlocks:
            this.props.maxBlocks === undefined
              ? undefined
              : Number.parseInt(this.props.maxBlocks.toString(), 10),
        })
      }

      if (this.props.value !== prevProps.value) {
        this.editor.send({
          type: 'update value',
          value: this.props.value,
        })
      }

      if (
        this.props.editorRef !== prevProps.editorRef &&
        this.props.editorRef
      ) {
        this.props.editorRef.current = this
      }
    }
  }

  componentWillUnmount(): void {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe()
    }

    if (this.actors) {
      stopActor(this.actors.editorActor)
      stopActor(this.actors.mutationActor)
      stopActor(this.actors.relayActor)
      stopActor(this.actors.syncActor)
    }
  }

  public setEditable = (editable: EditableAPI) => {
    this.editor._internal.editable = {
      ...this.editor._internal.editable,
      ...editable,
    }
  }

  render() {
    const legacyPatches = !this.props.editor
      ? (this.props.incomingPatches$ ?? this.props.patches$)
      : undefined

    return (
      <>
        {legacyPatches ? (
          <RoutePatchesObservableToEditorActor
            editorActor={this.editor._internal.editorActor}
            patches$={legacyPatches}
          />
        ) : null}
        <EditorActorContext.Provider value={this.editor._internal.editorActor}>
          <RelayActorContext.Provider value={this.actors!.relayActor}>
            <Slate
              editor={this.editor._internal.slateEditor.instance}
              initialValue={this.editor._internal.slateEditor.initialValue}
            >
              <PortableTextEditorContext.Provider value={this}>
                {this.props.children}
              </PortableTextEditorContext.Provider>
            </Slate>
          </RelayActorContext.Provider>
        </EditorActorContext.Provider>
      </>
    )
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.getActiveAnnotations)
   * ```
   */
  static activeAnnotations = (
    editor: PortableTextEditor,
  ): PortableTextObject[] => {
    return editor && editor.editable ? editor.editable.activeAnnotations() : []
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveAnnotation(...))
   * ```
   */
  static isAnnotationActive = (
    editor: PortableTextEditor,
    annotationType: PortableTextObject['_type'],
  ): boolean => {
    return editor && editor.editable
      ? editor.editable.isAnnotationActive(annotationType)
      : false
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'annotation.add',
   *  annotation: {
   *    name: '...',
   *    value: {...},
   *  }
   * })
   * ```
   */
  static addAnnotation = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): AddedAnnotationPaths | undefined =>
    editor.editable?.addAnnotation(type, value)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'blur',
   * })
   * ```
   */
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

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'focus',
   * })
   * ```
   */
  static focus = (editor: PortableTextEditor): void => {
    debug('Host requesting focus')
    editor.editable?.focus()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const focusBlock = useEditorSelector(editor, selectors.getFocusBlock)
   * ```
   */
  static focusBlock = (editor: PortableTextEditor) => {
    return editor.editable?.focusBlock()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const focusChild = useEditorSelector(editor, selectors.getFocusChild)
   * ```
   */
  static focusChild = (
    editor: PortableTextEditor,
  ): PortableTextChild | undefined => {
    return editor.editable?.focusChild()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const selection = useEditorSelector(editor, selectors.getSelection)
   * ```
   */
  static getSelection = (editor: PortableTextEditor) => {
    return editor.editable ? editor.editable.getSelection() : null
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const value = useEditorSelector(editor, selectors.getValue)
   * ```
   */
  static getValue = (editor: PortableTextEditor) => {
    return editor.editable?.getValue()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveStyle(...))
   * ```
   */
  static hasBlockStyle = (editor: PortableTextEditor, blockStyle: string) => {
    return editor.editable?.hasBlockStyle(blockStyle)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveListItem(...))
   * ```
   */
  static hasListStyle = (editor: PortableTextEditor, listStyle: string) => {
    return editor.editable?.hasListStyle(listStyle)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isSelectionCollapsed = useEditorSelector(editor, selectors.isSelectionCollapsed)
   * ```
   */
  static isCollapsedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isCollapsedSelection()

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isSelectionExpanded = useEditorSelector(editor, selectors.isSelectionExpanded)
   * ```
   */
  static isExpandedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isExpandedSelection()

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveDecorator(...))
   * ```
   */
  static isMarkActive = (editor: PortableTextEditor, mark: string) =>
    editor.editable?.isMarkActive(mark)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.span',
   *  text: '...',
   *  annotations: [{name: '...', value: {...}}],
   *  decorators: ['...'],
   * })
   * editor.send({
   *  type: 'insert.inline object',
   *  inlineObject: {
   *    name: '...',
   *    value: {...},
   *  },
   * })
   * ```
   */
  static insertChild = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    debug(`Host inserting child`)
    return editor.editable?.insertChild(type, value)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.block object',
   *  blockObject: {
   *    name: '...',
   *    value: {...},
   *  },
   *  placement: 'auto' | 'after' | 'before',
   * })
   * ```
   */
  static insertBlock = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    return editor.editable?.insertBlock(type, value)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.break',
   * })
   * ```
   */
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

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'select',
   *  selection: {...},
   * })
   * ```
   */
  static select = (
    editor: PortableTextEditor,
    selection: EditorSelection | null,
  ) => {
    debug(`Host setting selection`, selection)
    editor.editable?.select(selection)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'annotation.remove',
   *  annotation: {
   *    name: '...',
   *  },
   * })
   * ```
   */
  static removeAnnotation = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
  ) => editor.editable?.removeAnnotation(type)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'style.toggle',
   *  style: '...',
   * })
   * ```
   */
  static toggleBlockStyle = (
    editor: PortableTextEditor,
    blockStyle: string,
  ) => {
    debug(`Host is toggling block style`)
    return editor.editable?.toggleBlockStyle(blockStyle)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'list item.toggle',
   *  listItem: '...',
   * })
   * ```
   */
  static toggleList = (editor: PortableTextEditor, listStyle: string): void => {
    return editor.editable?.toggleList(listStyle)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'decorator.toggle',
   *  decorator: '...',
   * })
   * ```
   */
  static toggleMark = (editor: PortableTextEditor, mark: string): void => {
    debug(`Host toggling mark`, mark)
    editor.editable?.toggleMark(mark)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const selectedSlice = useEditorSelector(editor, selectors.getSelectedSlice)
   * ```
   */
  static getFragment = (
    editor: PortableTextEditor,
  ): PortableTextBlock[] | undefined => {
    return editor.editable?.getFragment()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *   type: 'history.undo',
   * })
   * ```
   */
  static undo = (editor: PortableTextEditor): void => {
    debug('Host undoing')
    editor.editable?.undo()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *   type: 'history.redo',
   * })
   * ```
   */
  static redo = (editor: PortableTextEditor): void => {
    debug('Host redoing')
    editor.editable?.redo()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isOverlapping = useEditorSelector(editor, selectors.isOverlappingSelection(selectionB))
   * ```
   */
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
