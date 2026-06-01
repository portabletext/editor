import {plugins} from '../engine-plugins/engine-plugins'
import {createEditor} from '../engine/create-editor'
import {withDOM} from '../engine/dom/plugin/with-dom'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import {getEditorSnapshot} from './editor-selector'
import type {RelayActor} from './relay-machine'

type EditorEngineConfig = {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export function createEditorEngine(
  config: EditorEngineConfig,
): PortableTextEditorEngine {
  debug.setup('creating new editor engine instance')

  const context = config.editorActor.getSnapshot().context

  const placeholderBlock = createPlaceholderBlock({
    context: {
      schema: context.schema,
      // No containers registered at engine-init time. NodePlugin
      // registrations run later, after the engine is attached.
      containers: new Map(),
      value: [],
      keyGenerator: context.keyGenerator,
    },
    blockIndexMap: new Map(),
  })

  const editor = createEditor()

  editor.schema = context.schema
  editor.keyGenerator = context.keyGenerator
  editor.converters = context.initialConverters
  editor.readOnly = context.initialReadOnly
  editor.containers = new Map()
  editor.publicContainers = new Map()
  editor.blockObjects = new Map()
  editor.inlineObjects = new Map()
  editor.spans = new Map()
  editor.textBlocks = new Map()

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

  const editorEngine = plugins(withDOM(editor), {
    editorActor: config.editorActor,
    relayActor: config.relayActor,
    subscriptions: config.subscriptions,
  })

  buildIndexMaps(
    {
      schema: context.schema,
      value: editorEngine.children,
    },
    {
      blockIndexMap: editorEngine.blockIndexMap,
      listIndexMap: editorEngine.listIndexMap,
    },
  )

  // Initialize the stored snapshot synchronously so the engine satisfies the
  // `Subscribable<EditorSnapshot>` contract from first read. Refreshed on
  // every editor-actor notification below.
  editorEngine.snapshot = getEditorSnapshot({
    editorEngineInstance: editorEngine,
  })

  config.subscriptions.push(() => {
    const subscription = config.editorActor.subscribe(() => {
      editorEngine.snapshot = getEditorSnapshot({
        editorEngineInstance: editorEngine,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return editorEngine
}
