import type {EditorActor} from '../editor/editor-machine'
import type {RelayActor} from '../editor/relay-machine'
import type {BaseOperation, Editor, Node, NodeEntry} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {createBehaviorApiPlugin} from './slate-plugin.behavior-api'
import {createHistoryPlugin} from './slate-plugin.history'
import {createNormalizationPlugin} from './slate-plugin.normalization'
import {createPatchesPlugin} from './slate-plugin.patches'
import {createSchemaPlugin} from './slate-plugin.schema'
import {createUniqueKeysPlugin} from './slate-plugin.unique-keys'
import {updateSelectionPlugin} from './slate-plugin.update-selection'
import {updateValuePlugin} from './slate-plugin.update-value'

export interface OriginalEditorFunctions {
  apply: (operation: BaseOperation) => void
  onChange: () => void
  normalizeNode: (entry: NodeEntry<Node>) => void
}

type PluginsOptions = {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export const plugins = <T extends Editor>(
  editor: T,
  options: PluginsOptions,
): PortableTextSlateEditor => {
  const e = editor as T & PortableTextSlateEditor
  const {editorActor, relayActor} = options
  const uniqueKeysPlugin = createUniqueKeysPlugin(editorActor)
  const schemaPlugin = createSchemaPlugin({
    editorActor,
  })
  const patchesPlugin = createPatchesPlugin({
    editorActor,
    relayActor,
    subscriptions: options.subscriptions,
  })
  const historyPlugin = createHistoryPlugin({
    editorActor,
    subscriptions: options.subscriptions,
  })
  const normalizationPlugin = createNormalizationPlugin(editorActor)
  const behaviorApiPlugin = createBehaviorApiPlugin(editorActor)

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return behaviorApiPlugin(
    schemaPlugin(
      uniqueKeysPlugin(
        normalizationPlugin(
          historyPlugin(
            patchesPlugin(
              updateValuePlugin(
                editorActor.getSnapshot().context,
                updateSelectionPlugin({
                  editorActor,
                  editor: e,
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}
