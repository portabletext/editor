import type {
  Path,
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
} from '@sanity/types'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ForwardedRef,
} from 'react'
import {Subject} from 'rxjs'
import {Slate} from 'slate-react'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorSelection,
} from '../types/editor'
import {debugWithName} from '../utils/debug'
import {Synchronizer} from './components/Synchronizer'
import {EditorActorContext} from './editor-actor-context'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {
  createEditableAPI,
  type AddedAnnotationPaths,
} from './plugins/createWithEditableAPI'
import {PortableTextEditorWithoutEditorProp} from './PortableTextEditorLegacy'
import type {PortableTextEditorInstance, PortableTextEditorProps} from './types'
import type {Editor} from './use-editor'

const debug = debugWithName('component:PortableTextEditor')

export type {PortableTextEditorInstance, PortableTextEditorProps}

const PortableTextEditorWithEditorProp = forwardRef(
  (
    props: Omit<PortableTextEditorProps<Editor>, 'editorRef'>,
    forwardedRef: ForwardedRef<PortableTextEditorInstance>,
  ) => {
    const [instance] = useState<PortableTextEditorInstance>(() => {
      const {editor} = props
      const {editorActor, slateEditor} = editor._internal
      editorActor.start()

      let editable = createEditableAPI(slateEditor.instance, editorActor)

      const schemaTypes = editorActor.getSnapshot().context.schema
      return {
        change$: new Subject(),
        editorActor,
        slateEditor,
        schemaTypes,
        editable,

        setEditable: (nextEditable: EditableAPI) => {
          editable = {...editable, ...nextEditable}
        },
        getValue: () => {
          if (editable) {
            return editable.getValue()
          }

          return undefined
        },
      }
    })

    /**
     * Forward ref to the instance, this mimics the previous behaviour that allowed consumers to get a class instance by setting a ref
     */
    useImperativeHandle(forwardedRef, () => instance, [instance])

    return (
      <>
        <EditorActorContext.Provider value={instance.editorActor}>
          <Slate
            editor={instance.slateEditor.instance}
            initialValue={instance.slateEditor.initialValue}
          >
            <PortableTextEditorContext.Provider value={instance}>
              <PortableTextEditorSelectionProvider
                editorActor={instance.editorActor}
              >
                <Synchronizer
                  editorActor={instance.editorActor}
                  getValue={instance.getValue}
                  onChange={(change) => {
                    /**
                     * For backwards compatibility, we relay all changes to the
                     * `change$` Subject as well.
                     */
                    instance.change$.next(change)
                  }}
                  value={props.value}
                />
                {props.children}
              </PortableTextEditorSelectionProvider>
            </PortableTextEditorContext.Provider>
          </Slate>
        </EditorActorContext.Provider>
      </>
    )
  },
)
PortableTextEditorWithEditorProp.displayName =
  'ForwardRef(PortableTextEditorWithEditorProp)'

const PortableTextEditorComponent = forwardRef(
  (
    props: PortableTextEditorProps<Editor | undefined>,
    forwardedRef: ForwardedRef<PortableTextEditorInstance>,
  ) => {
    const ref = useRef<PortableTextEditorInstance | null>(null)

    /**
     * Forward ref to the instance, this mimics the previous behaviour that allowed consumers to get a class instance by setting a ref
     */
    useImperativeHandle(forwardedRef, () => ref.current!)

    /**
     * Unclear if `editorRef` is really needed, as setting a regular `ref` has the same effect (and always has been)
     */
    useImperativeHandle(props.editorRef, () => ref.current!)

    return props.editor ? (
      <PortableTextEditorWithEditorProp
        ref={ref}
        editor={props.editor}
        value={props.value}
      >
        {props.children}
      </PortableTextEditorWithEditorProp>
    ) : (
      <PortableTextEditorWithoutEditorProp
        ref={(instance) => {
          ref.current = instance ? instance.getInstance() : null
        }}
        onChange={props.onChange}
        schemaType={props.schemaType}
        incomingPatches$={props.incomingPatches$}
        keyGenerator={props.keyGenerator}
        maxBlocks={props.maxBlocks}
        patches$={props.patches$}
        value={props.value}
        readOnly={props.readOnly}
      >
        {props.children}
      </PortableTextEditorWithoutEditorProp>
    )
  },
)
PortableTextEditorComponent.displayName = 'ForwardRef(PortableTextEditor)'

// Static API methods
const PortableTextEditorStaticMethods = {
  activeAnnotations: (
    editor: PortableTextEditorInstance,
  ): PortableTextObject[] => {
    return editor && editor.editable ? editor.editable.activeAnnotations() : []
  },
  isAnnotationActive: (
    editor: PortableTextEditorInstance,
    annotationType: PortableTextObject['_type'],
  ): boolean => {
    return editor && editor.editable
      ? editor.editable.isAnnotationActive(annotationType)
      : false
  },
  addAnnotation: <TSchemaType extends {name: string}>(
    editor: PortableTextEditorInstance,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): AddedAnnotationPaths | undefined =>
    editor.editable?.addAnnotation(type, value),
  blur: (editor: PortableTextEditorInstance): void => {
    debug('Host blurred')
    editor.editable?.blur()
  },
  delete: (
    editor: PortableTextEditorInstance,
    selection: EditorSelection,
    options?: EditableAPIDeleteOptions,
  ) => editor.editable?.delete(selection, options),
  findDOMNode: (
    editor: PortableTextEditorInstance,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.findDOMNode(element)
  },
  findByPath: (editor: PortableTextEditorInstance, path: Path) => {
    return editor.editable?.findByPath(path) || []
  },
  focus: (editor: PortableTextEditorInstance): void => {
    debug('Host requesting focus')
    editor.editable?.focus()
  },
  focusBlock: (editor: PortableTextEditorInstance) => {
    return editor.editable?.focusBlock()
  },
  focusChild: (
    editor: PortableTextEditorInstance,
  ): PortableTextChild | undefined => {
    return editor.editable?.focusChild()
  },
  getSelection: (editor: PortableTextEditorInstance) => {
    return editor.editable ? editor.editable.getSelection() : null
  },
  getValue: (editor: PortableTextEditorInstance) => {
    return editor.editable?.getValue()
  },
  hasBlockStyle: (editor: PortableTextEditorInstance, blockStyle: string) => {
    return editor.editable?.hasBlockStyle(blockStyle)
  },
  hasListStyle: (editor: PortableTextEditorInstance, listStyle: string) => {
    return editor.editable?.hasListStyle(listStyle)
  },
  isCollapsedSelection: (editor: PortableTextEditorInstance) =>
    editor.editable?.isCollapsedSelection(),
  isExpandedSelection: (editor: PortableTextEditorInstance) =>
    editor.editable?.isExpandedSelection(),
  isMarkActive: (editor: PortableTextEditorInstance, mark: string) =>
    editor.editable?.isMarkActive(mark),
  insertChild: <TSchemaType extends {name: string}>(
    editor: PortableTextEditorInstance,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    debug(`Host inserting child`)
    return editor.editable?.insertChild(type, value)
  },
  insertBlock: <TSchemaType extends {name: string}>(
    editor: PortableTextEditorInstance,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    return editor.editable?.insertBlock(type, value)
  },
  insertBreak: (editor: PortableTextEditorInstance): void => {
    return editor.editable?.insertBreak()
  },
  isVoid: (
    editor: PortableTextEditorInstance,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.isVoid(element)
  },
  isObjectPath: (_editor: PortableTextEditorInstance, path: Path): boolean => {
    if (!path || !Array.isArray(path)) return false
    const isChildObjectEditPath = path.length > 3 && path[1] === 'children'
    const isBlockObjectEditPath = path.length > 1 && path[1] !== 'children'
    return isBlockObjectEditPath || isChildObjectEditPath
  },
  marks: (editor: PortableTextEditorInstance) => {
    return editor.editable?.marks()
  },
  select: (
    editor: PortableTextEditorInstance,
    selection: EditorSelection | null,
  ) => {
    debug(`Host setting selection`, selection)
    editor.editable?.select(selection)
  },
  removeAnnotation: <TSchemaType extends {name: string}>(
    editor: PortableTextEditorInstance,
    type: TSchemaType,
  ) => editor.editable?.removeAnnotation(type),
  toggleBlockStyle: (
    editor: PortableTextEditorInstance,
    blockStyle: string,
  ) => {
    debug(`Host is toggling block style`)
    return editor.editable?.toggleBlockStyle(blockStyle)
  },
  toggleList: (editor: PortableTextEditorInstance, listStyle: string): void => {
    return editor.editable?.toggleList(listStyle)
  },
  toggleMark: (editor: PortableTextEditorInstance, mark: string): void => {
    debug(`Host toggling mark`, mark)
    editor.editable?.toggleMark(mark)
  },
  getFragment: (
    editor: PortableTextEditorInstance,
  ): PortableTextBlock[] | undefined => {
    debug(`Host getting fragment`)
    return editor.editable?.getFragment()
  },
  undo: (editor: PortableTextEditorInstance): void => {
    debug('Host undoing')
    editor.editable?.undo()
  },
  redo: (editor: PortableTextEditorInstance): void => {
    debug('Host redoing')
    editor.editable?.redo()
  },
  isSelectionsOverlapping: (
    editor: PortableTextEditorInstance,
    selectionA: EditorSelection,
    selectionB: EditorSelection,
  ) => {
    return editor.editable?.isSelectionsOverlapping(selectionA, selectionB)
  },
}

/**
 * The main Portable Text Editor component.
 * @public
 */
export const PortableTextEditor = Object.assign(
  PortableTextEditorComponent,
  PortableTextEditorStaticMethods,
)
