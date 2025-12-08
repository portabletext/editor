import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import {pluginHistory} from '../../history/slate-plugin.history'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import type {EditorActor} from '../editor-machine'
import type {RelayActor} from '../relay-machine'
import {createWithEventListeners} from './create-with-event-listeners'
import {createWithObjectKeys} from './createWithObjectKeys'
import {createWithPatches} from './createWithPatches'
import {createWithPortableTextMarkModel} from './createWithPortableTextMarkModel'
import {createWithSchemaTypes} from './createWithSchemaTypes'
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
  const withSchemaTypes = createWithSchemaTypes({
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
  const withPortableTextMarkModel = createWithPortableTextMarkModel(editorActor)

  const withEventListeners = createWithEventListeners(editorActor)

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return withEventListeners(
    withSchemaTypes(
      withObjectKeys(
        withPortableTextMarkModel(
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
