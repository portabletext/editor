import {createEditor, type Descendant} from 'slate'
import {withReact} from 'slate-react'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debugWithName} from '../internal-utils/debug'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'
import {withPlugins} from './plugins/with-plugins'
import type {RelayActor} from './relay-machine'
import {KEY_TO_SLATE_ELEMENT} from './weakMaps'

const debug = debugWithName('setup')

type SlateEditorConfig = {
  editorActor: EditorActor
  relayActor: RelayActor
  subscriptions: Array<() => () => void>
}

export type SlateEditor = {
  instance: PortableTextSlateEditor
  initialValue: Array<Descendant>
}

export function createSlateEditor(config: SlateEditorConfig): SlateEditor {
  debug('Creating new Slate editor instance')

  const placeholderBlock = createPlaceholderBlock(
    config.editorActor.getSnapshot().context,
  )

  const editor = createEditor()
  editor.decoratedRanges = []
  editor.decoratorState = {}
  editor.value = [placeholderBlock]
  editor.blockIndexMap = new Map<string, number>()
  editor.listIndexMap = new Map<string, number>()

  const instance = withPlugins(withReact(editor), {
    editorActor: config.editorActor,
    relayActor: config.relayActor,
    subscriptions: config.subscriptions,
  })

  KEY_TO_SLATE_ELEMENT.set(instance, {})

  buildIndexMaps(
    {
      schema: config.editorActor.getSnapshot().context.schema,
      value: instance.value,
    },
    {
      blockIndexMap: instance.blockIndexMap,
      listIndexMap: instance.listIndexMap,
    },
  )

  const slateEditor: SlateEditor = {
    instance,
    initialValue: [placeholderBlock],
  }

  return slateEditor
}
