import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import {plugins} from '../slate-plugins/slate-plugins'
import {createEditor} from '../slate/create-editor'
import {withReact} from '../slate/react/plugin/with-react'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'
import type {RelayActor} from './relay-machine'

type SlateEditorConfig = {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export function createSlateEditor(
  config: SlateEditorConfig,
): PortableTextSlateEditor {
  debug.setup('creating new slate editor instance')

  const context = config.editorActor.getSnapshot().context

  const placeholderBlock = createPlaceholderBlock(context)

  const editor = createEditor()

  editor.schema = context.schema
  editor.keyGenerator = context.keyGenerator
  editor.containers = new Map()
  editor.leafConfigs = new Map()

  editor.decoratedRanges = []
  editor.decoratorState = {}
  editor.blockIndexMap = new Map<string, number>()
  editor.history = {undos: [], redos: []}

  editor.listIndexMap = new Map<string, number>()
  editor.remotePatches = []
  editor.undoStepId = undefined

  editor.children = [placeholderBlock]

  editor.isDeferringMutations = false
  editor.isNormalizingNode = false
  editor.isPatching = true
  editor.isPerformingBehaviorOperation = false
  editor.isProcessingRemoteChanges = false
  editor.isRedoing = false
  editor.isUndoing = false
  editor.withHistory = true

  const slateEditor = plugins(withReact(editor), {
    editorActor: config.editorActor,
    relayActor: config.relayActor,
    subscriptions: config.subscriptions,
  })

  buildIndexMaps(
    {
      schema: context.schema,
      value: slateEditor.children,
    },
    {
      blockIndexMap: slateEditor.blockIndexMap,
      listIndexMap: slateEditor.listIndexMap,
    },
  )

  return slateEditor
}
