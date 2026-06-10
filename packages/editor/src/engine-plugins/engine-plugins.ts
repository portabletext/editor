import type {EditorActor} from '../editor/editor-machine'
import type {Editor} from '../engine/interfaces/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {createBehaviorApiPlugin} from './engine-plugin.behavior-api'
import {updateSelectionPlugin} from './engine-plugin.update-selection'

type PluginsOptions = {
  editorActor: EditorActor
}

export const plugins = <T extends Editor>(
  editor: T,
  options: PluginsOptions,
): PortableTextEditorEngine => {
  const e = editor as T & PortableTextEditorEngine
  const {editorActor} = options
  const behaviorApiPlugin = createBehaviorApiPlugin(editorActor)

  return behaviorApiPlugin(
    updateSelectionPlugin({
      editorActor,
      editor: e,
    }),
  )
}
