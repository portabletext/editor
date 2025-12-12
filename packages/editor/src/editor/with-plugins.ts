import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {createWithEventListeners} from './create-with-event-listeners'
import type {EditorActor} from './editor-machine'
import type {RelayActor} from './relay-machine'
import {pluginHistory} from './slate-plugin.history'
import {createWithNormalize} from './slate-plugin.normalize'
import {createWithObjectKeys} from './slate-plugin.object-keys'
import {createWithPatches} from './slate-plugin.patches'
import {createWithSchema} from './slate-plugin.schema'
import {pluginUpdateSelection} from './slate-plugin.update-selection'
import {pluginUpdateValue} from './slate-plugin.update-value'

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

export const withPlugins = <T extends Editor>(
  editor: T,
  options: PluginsOptions,
): PortableTextSlateEditor => {
  const e = editor as T & PortableTextSlateEditor
  const {editorActor, relayActor} = options
  const withObjectKeys = createWithObjectKeys(editorActor)
  const withSchema = createWithSchema({
    editorActor,
  })
  const withPatches = createWithPatches({
    editorActor,
    relayActor,
    subscriptions: options.subscriptions,
  })
  const withUndoRedo = pluginHistory({
    editorActor,
    subscriptions: options.subscriptions,
  })
  const withNormalize = createWithNormalize(editorActor)

  const withEventListeners = createWithEventListeners(editorActor)

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return withEventListeners(
    withSchema(
      withObjectKeys(
        withNormalize(
          withUndoRedo(
            withPatches(
              pluginUpdateValue(
                editorActor.getSnapshot().context,
                pluginUpdateSelection({
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
