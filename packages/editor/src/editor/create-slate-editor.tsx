import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import {createEditor, type Descendant} from '../slate'
import {plugins} from '../slate-plugins/slate-plugins'
import {withReact} from '../slate-react'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'
import type {RelayActor} from './relay-machine'

type SlateEditorConfig = {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export type SlateEditor = {
  instance: PortableTextSlateEditor
  initialValue: Array<Descendant>
}

export function createSlateEditor(config: SlateEditorConfig): SlateEditor {
  debug.setup('creating new slate editor instance')

  const context = config.editorActor.getSnapshot().context

  const placeholderBlock = createPlaceholderBlock(context)

  const editor = createEditor()

  editor.decoratedRanges = []
  editor.decoratorState = {}
  editor.blockIndexMap = new Map<string, number>()
  editor.history = {undos: [], redos: []}
  editor.lastSelection = null
  editor.lastSlateSelection = null
  editor.listIndexMap = new Map<string, number>()
  editor.remotePatches = []
  editor.undoStepId = undefined

  editor.isDeferringMutations = false
  editor.isNormalizingNode = false
  editor.isPatching = true
  editor.isPerformingBehaviorOperation = false
  editor.isProcessingRemoteChanges = false
  editor.isRedoing = false
  editor.isUndoing = false
  editor.withHistory = true

  const instance = plugins(withReact(editor), {
    editorActor: config.editorActor,
    relayActor: config.relayActor,
    subscriptions: config.subscriptions,
  })

  const initialValue = [placeholderBlock]

  // Set children before building index maps so the initial render has
  // correct blockIndexMap entries. The <Slate> component will also set
  // editor.children = initialValue, but buildIndexMaps needs it now.
  instance.children = initialValue as any

  buildIndexMaps(
    {
      schema: context.schema,
      value: instance.children,
    },
    {
      blockIndexMap: instance.blockIndexMap,
      listIndexMap: instance.listIndexMap,
    },
  )

  const slateEditor: SlateEditor = {
    instance,
    initialValue,
  }

  return slateEditor
}
