import type {EditorActor} from '../editor/editor-machine'
import type {Editor} from '../engine/interfaces/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createBehaviorApiPlugin} from './engine-plugin.behavior-api'
import {createHistoryPlugin} from './engine-plugin.history'
import {createPatchesPlugin} from './engine-plugin.patches'
import {updateSelectionPlugin} from './engine-plugin.update-selection'
import {updateValuePlugin} from './engine-plugin.update-value'

type PluginsOptions = {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}

export const plugins = <T extends Editor>(
  editor: T,
  options: PluginsOptions,
): PortableTextEditorEngine => {
  const e = editor as T & PortableTextEditorEngine
  const {editorActor} = options
  const patchesPlugin = createPatchesPlugin({
    editorActor,
    subscriptions: options.subscriptions,
  })
  const historyPlugin = createHistoryPlugin({
    editorActor,
    subscriptions: options.subscriptions,
  })
  const behaviorApiPlugin = createBehaviorApiPlugin(editorActor)

  // Ordering is important here, selection dealing last, data manipulation in the middle and core model stuff first.
  return behaviorApiPlugin(
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
  )
}
