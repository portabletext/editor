import type {BaseOperation, Editor, Node, NodeEntry} from 'slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'
import type {RelayActor} from './relay-machine'
import {withBehaviorApi} from './slate-plugin.behavior-api'
import {withHistory} from './slate-plugin.history'
import {withIndexMaps} from './slate-plugin.index-maps'
import {withNormalization} from './slate-plugin.normalization'
import {withObjectKeys} from './slate-plugin.object-keys'
import {withPatches} from './slate-plugin.patches'
import {withSchema} from './slate-plugin.schema'
import {withUpdateSelection} from './slate-plugin.update-selection'
import {withValue} from './slate-plugin.value'

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

export const withPlugins = (
  editor: Editor,
  options: PluginsOptions,
): PortableTextSlateEditor => {
  const {editorActor, relayActor} = options
  const context = editorActor.getSnapshot().context

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return withBehaviorApi(
    editorActor,
    withSchema(
      editorActor,
      withObjectKeys(
        editorActor,
        withNormalization(
          editorActor,
          withHistory(
            {editorActor, subscriptions: options.subscriptions},
            withPatches(
              {editorActor, relayActor, subscriptions: options.subscriptions},
              withValue(
                context,
                withIndexMaps(
                  context,
                  withUpdateSelection({
                    editorActor,
                    editor,
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )
}
