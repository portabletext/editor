import {createEditor} from 'slate'
import {withReact} from 'slate-react'
import type {PortableTextSlateEditor} from '../types/editor'
import {debugWithName} from '../utils/debug'
import {KEY_TO_SLATE_ELEMENT, KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {EditorActor} from './editor-machine'
import {withPlugins} from './plugins/with-plugins'

const debug = debugWithName('component:PortableTextEditor:SlateContainer')

type SlateEditorConfig = {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
}

/**
 * @internal
 */
export type SlateEditor = PortableTextSlateEditor

export function createSlateEditor({
  editorActor,
  subscriptions,
}: SlateEditorConfig): SlateEditor {
  debug('Creating new Slate editor instance', editorActor.id)

  // let unsubscriptions: Array<() => void> = []

  const instance = withPlugins(withReact(createEditor()), {
    editorActor,
    subscriptions,
  })

  KEY_TO_VALUE_ELEMENT.set(instance, {})
  KEY_TO_SLATE_ELEMENT.set(instance, {})

  return instance

  // for (const subscription of subscriptions) {
  //   unsubscriptions.push(subscription())
  // }

  // config.editorActor.subscribe((snapshot) => {
  //   if (snapshot.status !== 'active') {
  //     debug('Destroying Slate editor')
  //     instance.destroy()
  //     for (const unsubscribe of unsubscriptions) {
  //       unsubscribe()
  //     }
  //     subscriptions = []
  //     unsubscriptions = []
  //   }
  // })

  // const slateEditor: SlateEditor = instance

  // slateEditors.set(config.editorActor, slateEditor)

  // return slateEditor
}

// const initialValue = [instance.pteCreateTextBlock({decorators: []})]
