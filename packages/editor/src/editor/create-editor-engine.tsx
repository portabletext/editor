import {plugins} from '../engine-plugins/engine-plugins'
import {createEditor} from '../engine/create-editor'
import {withDOM} from '../engine/dom/plugin/with-dom'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
import type {Relay} from './relay'
import {setupRemotePatches} from './remote-patches'
import {subscribeHistory} from './subscriber.history'
import {subscribePatchGeneration} from './subscriber.patch-generation'
import {subscribeUpdateValue} from './subscriber.update-value'

type EditorEngineConfig = {
  editorActor: EditorActor
  relay: Relay
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

  // The engine's observable state lives on `editor.snapshot`. The
  // wrapping snapshot and context objects are reassigned (new
  // identity) when the editor settles; inner mutable values
  // (selection, value, etc) are mutated in place by operations.
  editor.snapshot = {
    blockIndexMap: new Map<string, number>(),
    context: {
      containers: new Map(),
      converters: context.initialConverters,
      keyGenerator: context.keyGenerator,
      readOnly: context.initialReadOnly,
      schema: context.schema,
      selection: null,
      value: [placeholderBlock],
    },
    decoratorState: {},
  }

  editor.containers = new Map()
  editor.blockObjects = new Map()
  editor.inlineObjects = new Map()
  editor.spans = new Map()
  editor.textBlocks = new Map()

  editor.decoratedRanges = []
  editor.blockIndexMap = editor.snapshot.blockIndexMap
  editor.history = {undos: [], redos: []}

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

  const editorEngine = plugins(withDOM(editor), {
    editorActor: config.editorActor,
  })

  subscribeUpdateValue(context, editorEngine)
  subscribePatchGeneration({
    editorActor: config.editorActor,
    relay: config.relay,
    editor: editorEngine,
  })
  setupRemotePatches({
    editorActor: config.editorActor,
    subscriptions: config.subscriptions,
    editor: editorEngine,
  })
  subscribeHistory({
    editorActor: config.editorActor,
    subscriptions: config.subscriptions,
    editor: editorEngine,
  })

  buildIndexMaps(
    {
      schema: context.schema,
      value: editorEngine.snapshot.context.value,
    },
    {
      blockIndexMap: editorEngine.blockIndexMap,
      listIndexMap: editorEngine.listIndexMap,
    },
  )

  // Each editor-actor notification flips the snapshot wrapper
  // identity so `useSyncExternalStore` re-evaluates selectors. The
  // inner state (selection, value, decoratorState) is read directly
  // from `editor.snapshot.context` and mutated in place by
  // operations; cross-mutation reads stay reference-stable.
  config.subscriptions.push(() => {
    const subscription = config.editorActor.subscribe(() => {
      editorEngine.snapshot = {
        ...editorEngine.snapshot,
        context: {...editorEngine.snapshot.context},
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  })

  return editorEngine
}
