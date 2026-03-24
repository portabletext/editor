import type {EditorActor} from '../editor/editor-machine'
import type {RelayActor} from '../editor/relay-machine'
import type {Editor} from '../slate/interfaces/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {setupApply} from './slate-plugin.apply'
import {createBehaviorApiPlugin} from './slate-plugin.behavior-api'
import {setupNormalizeNode} from './slate-plugin.normalize-node-collapsed'
import {createSchemaPlugin} from './slate-plugin.schema'
import {updateSelectionPlugin} from './slate-plugin.update-selection'

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

  // Schema plugin: sets editor.schema, editor.isInline
  // Note: schema's normalizeNode is now handled by setupNormalizeNode
  const schemaPlugin = createSchemaPlugin({
    editorActor,
  })
  schemaPlugin(e)

  // Selection plugin: wraps onChange for selection tracking
  updateSelectionPlugin({
    editorActor,
    editor: e,
  })

  // Collapsed apply: replaces uniqueKeys, history, patches, updateValue,
  // withReact, withDom, and core apply plugins
  setupApply(e, {
    editorActor,
    relayActor,
    subscriptions: options.subscriptions,
  })

  // Collapsed normalizeNode: replaces uniqueKeys, schema, and normalization
  // plugin normalizeNode chains
  setupNormalizeNode(e, editorActor)

  // Behavior API: wraps select/setSelection (not apply)
  const behaviorApiPlugin = createBehaviorApiPlugin(editorActor)
  behaviorApiPlugin(e)

  return e
}
