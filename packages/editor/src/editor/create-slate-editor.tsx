import {createEditor, type Descendant} from 'slate'
import {withReact} from 'slate-react'
import {debugWithName} from '../internal-utils/debug'
import {toSlateValue} from '../internal-utils/values'
import {
  KEY_TO_SLATE_ELEMENT,
  KEY_TO_VALUE_ELEMENT,
} from '../internal-utils/weakMaps'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorActor} from './editor-machine'
import {withPlugins} from './plugins/with-plugins'

const debug = debugWithName('component:PortableTextEditor:SlateContainer')

type SlateEditorConfig = {
  editorActor: EditorActor
}

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

  const unsubscriptions: Array<() => void> = []
  const subscriptions: Array<() => () => void> = []

  const instance = withPlugins(withReact(createEditor()), {
    editorActor: config.editorActor,
    subscriptions,
  })

  KEY_TO_VALUE_ELEMENT.set(instance, {})
  KEY_TO_SLATE_ELEMENT.set(instance, {})

  for (const subscription of subscriptions) {
    unsubscriptions.push(subscription())
  }

  instance.value = [
    {
      _type: config.editorActor.getSnapshot().context.schema.block.name,
      _key: config.editorActor.getSnapshot().context.keyGenerator(),
      style:
        config.editorActor.getSnapshot().context.schema.styles[0].value ||
        'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: config.editorActor.getSnapshot().context.keyGenerator(),
          text: '',
          marks: [],
        },
      ],
    },
  ]

  const initialValue = toSlateValue(instance.value, {
    schemaTypes: config.editorActor.getSnapshot().context.schema,
  })

  const slateEditor: SlateEditor = {
    instance,
    initialValue,
  }

  slateEditors.set(config.editorActor, slateEditor)

  return slateEditor
}
