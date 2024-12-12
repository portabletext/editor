import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import type {PortableTextSlateEditor} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import type {EditorActor} from '../editor-machine'
import {mutationMachine} from '../mutation-machine'
import {syncMachine} from './sync-value'

const debug = debugWithName('component:PortableTextEditor:Synchronizer')

/**
 * @internal
 */
export interface SynchronizerProps {
  editorActor: EditorActor
  slateEditor: PortableTextSlateEditor
}

/**
 * Synchronizes the server value with the editor, and provides various contexts for the editor state.
 * @internal
 */
export function Synchronizer(props: SynchronizerProps) {
  const {editorActor, slateEditor} = props

  const value = useSelector(props.editorActor, (s) => s.context.value)
  const readOnly = useSelector(props.editorActor, (s) =>
    s.matches({'edit mode': 'read only'}),
  )
  const syncActorRef = useActorRef(syncMachine, {
    input: {
      keyGenerator: props.editorActor.getSnapshot().context.keyGenerator,
      readOnly: props.editorActor
        .getSnapshot()
        .matches({'edit mode': 'read only'}),
      schema: props.editorActor.getSnapshot().context.schema,
      slateEditor,
    },
  })
  const mutationActorRef = useActorRef(mutationMachine, {
    input: {
      schema: editorActor.getSnapshot().context.schema,
      slateEditor,
    },
  })

  useEffect(() => {
    const subscription = mutationActorRef.on('*', (event) => {
      if (event.type === 'has pending patches') {
        syncActorRef.send({type: 'has pending patches'})
      }
      if (event.type === 'mutation') {
        syncActorRef.send({type: 'mutation'})
        editorActor.send(event)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [mutationActorRef, syncActorRef, editorActor])

  useEffect(() => {
    const subscription = syncActorRef.on('*', (event) => {
      props.editorActor.send(event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorActor, syncActorRef])

  useEffect(() => {
    syncActorRef.send({type: 'toggle readOnly'})
  }, [syncActorRef, readOnly])

  useEffect(() => {
    debug('Value from props changed, syncing new value')
    syncActorRef.send({type: 'update value', value})
  }, [syncActorRef, value])

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    debug('Subscribing to patch events')
    const sub = editorActor.on('patch', (event) => {
      mutationActorRef.send(event)
    })
    return () => {
      debug('Unsubscribing to patch events')
      sub.unsubscribe()
    }
  }, [editorActor, mutationActorRef, slateEditor])

  return null
}

Synchronizer.displayName = 'Synchronizer'
