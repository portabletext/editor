import {createEditor, type Descendant} from 'slate'
import {withReact} from 'slate-react'
import type {PortableTextSlateEditor} from '../types/editor'
import {debugWithName} from '../utils/debug'
import {KEY_TO_SLATE_ELEMENT, KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {EditorActor} from './editor-machine'
import {withPlugins} from './plugins/with-plugins'

const debug = debugWithName('component:PortableTextEditor:SlateContainer')

type SlateEditorConfig = {
  editorActor: EditorActor
}

/**
 * @internal
 */
export type SlateEditor = {
  instance: PortableTextSlateEditor
  initialValue: Array<Descendant>
}

const slateEditors = new WeakMap<EditorActor, SlateEditor>()

export function createSlateEditor(config: SlateEditorConfig): SlateEditor {
  const existingSlateEditor = slateEditors.get(config.editorActor)

  if (existingSlateEditor) {
    debug('Reusing existing Slate editor instance', config.editorActor.id)
    return existingSlateEditor
  }

  debug('Creating new Slate editor instance', config.editorActor.id)

  let unsubscriptions: Array<() => void> = []
  let subscriptions: Array<() => () => void> = []

  const instance = withPlugins(withReact(createEditor()), {
    editorActor: config.editorActor,
    subscriptions,
  })

  KEY_TO_VALUE_ELEMENT.set(instance, {})
  KEY_TO_SLATE_ELEMENT.set(instance, {})

  for (const subscription of subscriptions) {
    unsubscriptions.push(subscription())
  }

  config.editorActor.subscribe((snapshot) => {
    if (snapshot.status !== 'active') {
      debug('Destroying Slate editor')
      instance.destroy()
      for (const unsubscribe of unsubscriptions) {
        unsubscribe()
      }
      subscriptions = []
      unsubscriptions = []
    }
  })

  const initialValue = [instance.pteCreateTextBlock({decorators: []})]

  const slateEditor: SlateEditor = {
    instance,
    initialValue,
  }

  slateEditors.set(config.editorActor, slateEditor)

  return slateEditor
}
