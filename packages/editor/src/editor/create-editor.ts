import type {
  ArrayDefinition,
  ArraySchemaType,
  PortableTextBlock,
} from '@sanity/types'
import {useState} from 'react'
import {createEditor as createSlateEditor, Descendant} from 'slate'
import {withReact} from 'slate-react'
import {createActor} from 'xstate'
import {getPortableTextMemberSchemaTypes} from '../utils/getPortableTextMemberSchemaTypes'
import {compileType} from '../utils/schema'
import type {Behavior, PickFromUnion} from './behavior/behavior.types'
import type {SlateEditor} from './create-slate-editor'
import {compileSchemaDefinition, type SchemaDefinition} from './define-schema'
import {
  editorMachine,
  type EditorActor,
  type InternalEditorEvent,
} from './editor-machine'
import {defaultKeyGenerator} from './key-generator'
import {withPlugins} from './plugins/with-plugins'

/**
 * @alpha
 */
export type EditorConfig = {
  behaviors?: Array<Behavior>
  keyGenerator?: () => string
  initialValue?: Array<PortableTextBlock>
  readOnly?: boolean
} & (
  | {
      schemaDefinition: SchemaDefinition
      schema?: undefined
    }
  | {
      schemaDefinition?: undefined
      schema: ArraySchemaType<PortableTextBlock> | ArrayDefinition
    }
)

/**
 * @alpha
 */
export type EditorEvent = PickFromUnion<
  InternalEditorEvent,
  'type',
  | 'annotation.toggle'
  | 'focus'
  | 'patches'
  | 'toggle readOnly'
  | 'update behaviors'
  | 'update schema'
  | 'update value'
>

/**
 * @alpha
 */
export type Editor = {
  send: (event: EditorEvent) => void
  on: EditorActor['on']
  teardown: () => void
  _internal: {
    editorActor: EditorActor
    slateEditor: {
      instance: SlateEditor
      initialValue: Array<Descendant>
    }
  } & (
    | {
        schemaDefinition: SchemaDefinition
        schema?: undefined
      }
    | {
        schemaDefinition?: undefined
        schema: ArraySchemaType<PortableTextBlock> | ArrayDefinition
      }
  )
}

/**
 * @alpha
 */
export function createEditor(config: EditorConfig): Editor {
  const editorActor = createActor(editorMachine, {
    input: configToMachineInput(config),
  })
  const bareSlateEditor = withReact(createSlateEditor())

  const subscriptions: Array<() => () => void> = []
  const unsubscriptions: Array<() => void> = []

  const slateEditor = withPlugins(bareSlateEditor, {
    editorActor,
    subscriptions,
  })

  for (const subscription of subscriptions) {
    unsubscriptions.push(subscription())
  }

  return createEditorRef({
    config,
    editorActor,
    slateEditor: {
      instance: slateEditor,
      initialValue: [slateEditor.pteCreateTextBlock({decorators: []})],
    },
    unsubscriptions,
  })
}

/**
 * @alpha
 */
export function useEditorRef(config: EditorConfig): Editor {
  let [
    [currentConfig, currentEditorRef, bareSlateEditor, currentUnsubscriptions],
    setCurrent,
  ] = useState(() => {
    const editorActor = createActor(editorMachine, {
      input: configToMachineInput(config),
    })
    const subscriptions: Array<() => () => void> = []
    const unsubscriptions: Array<() => void> = []

    const bareSlateEditor = withReact(createSlateEditor())

    const slateEditor = withPlugins(bareSlateEditor, {
      editorActor,
      subscriptions,
    })

    for (const subscription of subscriptions) {
      unsubscriptions.push(subscription())
    }

    const editorRef = createEditorRef({
      config,
      editorActor,
      slateEditor: {
        instance: slateEditor,
        initialValue: [slateEditor.pteCreateTextBlock({decorators: []})],
      },
      unsubscriptions,
    })

    return [config, editorRef, bareSlateEditor, unsubscriptions]
  })

  // if (config !== currentConfig) {
  //   const newEditorActor = createActor(editorMachine, {
  //     input: configToMachineInput(config),
  //     snapshot: currentEditorRef._internal.editorActor.getPersistedSnapshot(),
  //   })

  //   for (const unsubscribe of currentUnsubscriptions) {
  //     unsubscribe()
  //   }

  //   console.log({newEditorActorId: newEditorActor.id})

  //   const subscriptions: Array<() => () => void> = []
  //   const unsubscriptions: Array<() => void> = []

  //   currentEditorRef._internal.slateEditor.instance.apply =
  //     bareSlateEditor.apply
  //   currentEditorRef._internal.slateEditor.instance.onChange =
  //     bareSlateEditor.onChange
  //   currentEditorRef._internal.slateEditor.instance.normalizeNode =
  //     bareSlateEditor.normalizeNode
  //   currentEditorRef._internal.slateEditor.instance.history = {
  //     undos: [],
  //     redos: [],
  //   }

  //   // withPlugins(currentEditorRef._internal.slateEditor.instance, {
  //   //   editorActor: newEditorActor,
  //   //   subscriptions,
  //   // })

  //   // for (const subscription of subscriptions) {
  //   //   unsubscriptions.push(subscription())
  //   // }

  //   const newEditorRef = createEditorRef({
  //     config,
  //     editorActor: newEditorActor,
  //     slateEditor: {
  //       instance: currentEditorRef._internal.slateEditor.instance,
  //       initialValue: currentEditorRef._internal.slateEditor.instance.children,
  //     },
  //     unsubscriptions: currentUnsubscriptions,
  //   })

  //   debugger

  //   setCurrent([config, newEditorRef, bareSlateEditor, unsubscriptions])

  //   currentEditorRef = newEditorRef
  // }

  return currentEditorRef
}

function configToMachineInput(config: EditorConfig) {
  const schema = config.schemaDefinition
    ? compileSchemaDefinition(config.schemaDefinition).pteSchema
    : getPortableTextMemberSchemaTypes(
        config.schema.hasOwnProperty('jsonType')
          ? config.schema
          : compileType(config.schema),
      )

  return {
    behaviors: config.behaviors,
    keyGenerator: config.keyGenerator ?? defaultKeyGenerator,
    readOnly: config.readOnly,
    schema,
    value: config.initialValue,
  } as const
}

function createEditorRef({
  config,
  editorActor,
  slateEditor,
  unsubscriptions,
}: {
  config: EditorConfig
  editorActor: EditorActor
  slateEditor: {instance: SlateEditor; initialValue: Array<Descendant>}
  unsubscriptions: Array<() => void>
}): Editor {
  return {
    send: (event) => {
      editorActor.send(event)
    },
    on: (event, listener) => editorActor.on(event, listener),
    _internal: {
      editorActor,
      slateEditor,
      ...(config.schemaDefinition
        ? {schemaDefinition: config.schemaDefinition}
        : {schema: config.schema}),
    },
    teardown: () => {
      editorActor.stop()

      if (unsubscriptions) {
        for (const unsubscribe of unsubscriptions) {
          unsubscribe()
        }
      }
    },
  }
}
