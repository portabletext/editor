import {Component, useEffect, useMemo} from 'react'
import {Subject} from 'rxjs'
import {Slate} from 'slate-react'
import {createActor} from 'xstate'
import type {
  EditableAPI,
  EditorChanges,
  PatchObservable,
  PortableTextMemberSchemaTypes,
} from '../types/editor'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import {Synchronizer} from './components/Synchronizer'
import {createSlateEditor, type SlateEditor} from './create-slate-editor'
import {EditorActorContext} from './editor-actor-context'
import {editorMachine, type EditorActor} from './editor-machine'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {PortableTextEditorSelectionProvider} from './hooks/usePortableTextEditorSelection'
import {defaultKeyGenerator} from './key-generator'
import {createEditableAPI} from './plugins/createWithEditableAPI'
import type {PortableTextEditorInstance, PortableTextEditorProps} from './types'

/**
 * The legacy class component based version, that is used when `editor` is not provided
 */
export class PortableTextEditorWithoutEditorProp extends Component<
  Omit<PortableTextEditorProps<undefined>, 'editorRef'>
> {
  public static displayName = 'PortableTextEditorWithoutEditorProp'
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
  private slateEditor: SlateEditor

  /**
   * Compatibility with the new instance API
   */
  public getInstance = (): PortableTextEditorInstance => {
    return {
      change$: this.change$,
      editorActor: this.editorActor,
      slateEditor: this.slateEditor,
      schemaTypes: this.schemaTypes,
      editable: this.editable,
      setEditable: this.setEditable,
      getValue: this.getValue,
    }
  }

  constructor(props: PortableTextEditorProps<undefined>) {
    super(props)

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

    this.editorActor = createActor(editorMachine, {
      input: {
        keyGenerator: props.keyGenerator || defaultKeyGenerator,
        schema: this.schemaTypes,
      },
    })
    this.editorActor.start()

    this.slateEditor = createSlateEditor({
      editorActor: this.editorActor,
    })

    if (props.readOnly) {
      this.editorActor.send({
        type: 'toggle readOnly',
      })
    }

    if (props.maxBlocks) {
      this.editorActor.send({
        type: 'update maxBlocks',
        maxBlocks:
          props.maxBlocks === undefined
            ? undefined
            : Number.parseInt(props.maxBlocks.toString(), 10),
      })
    }

    this.editable = createEditableAPI(
      this.slateEditor.instance,
      this.editorActor,
    )
  }

  componentDidUpdate(prevProps: PortableTextEditorProps) {
    // Set up the schema type lookup table again if the source schema type changes
    if (this.props.schemaType !== prevProps.schemaType) {
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

    if (this.props.readOnly !== prevProps.readOnly) {
      this.editorActor.send({
        type: 'toggle readOnly',
      })
    }

    if (this.props.maxBlocks !== prevProps.maxBlocks) {
      this.editorActor.send({
        type: 'update maxBlocks',
        maxBlocks:
          this.props.maxBlocks === undefined
            ? undefined
            : Number.parseInt(this.props.maxBlocks.toString(), 10),
      })
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
          <Slate
            editor={this.slateEditor.instance}
            initialValue={this.slateEditor.initialValue}
          >
            <PortableTextEditorContextCompatibilityProvider
              getInstance={this.getInstance}
            >
              <PortableTextEditorSelectionProvider
                editorActor={this.editorActor}
              >
                <Synchronizer
                  editorActor={this.editorActor}
                  getValue={this.getValue}
                  onChange={(change) => {
                    this.props.onChange(change)
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
            </PortableTextEditorContextCompatibilityProvider>
          </Slate>
        </EditorActorContext.Provider>
      </>
    )
  }
}

function PortableTextEditorContextCompatibilityProvider(props: {
  children: React.ReactNode
  getInstance: () => PortableTextEditorInstance
}) {
  const {children, getInstance} = props
  const instance = useMemo(() => getInstance(), [getInstance])
  return (
    <PortableTextEditorContext.Provider value={instance}>
      {children}
    </PortableTextEditorContext.Provider>
  )
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
