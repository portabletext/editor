import {createEditor, type Descendant} from 'slate'
import {withReact} from 'slate-react'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debugWithName} from '../internal-utils/debug'
import {toSlateValue} from '../internal-utils/values'
import {
  KEY_TO_SLATE_ELEMENT,
  KEY_TO_VALUE_ELEMENT,
} from '../internal-utils/weakMaps'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorActor} from './editor-machine'
import {withPlugins} from './plugins/with-plugins'
import type {RelayActor} from './relay-machine'

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

  const instance = withPlugins(withReact(createEditor()), {
    editorActor: config.editorActor,
    relayActor: config.relayActor,
    subscriptions: config.subscriptions,
  })

  KEY_TO_VALUE_ELEMENT.set(instance, {})
  KEY_TO_SLATE_ELEMENT.set(instance, {})

  instance.decoratorState = {}
  instance.markState = undefined
  instance.value = [
    createPlaceholderBlock(config.editorActor.getSnapshot().context),
  ]

  const initialValue = toSlateValue(instance.value, {
    schemaTypes: config.editorActor.getSnapshot().context.schema,
  })

  const slateEditor: SlateEditor = {
    instance,
    initialValue,
  }

  return slateEditor
}
