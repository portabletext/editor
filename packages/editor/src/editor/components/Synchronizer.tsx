import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {throttle} from 'lodash'
import {useCallback, useEffect, useRef} from 'react'
import {Editor} from 'slate'
import {useSlate} from 'slate-react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorChange} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {IS_PROCESSING_LOCAL_CHANGES} from '../../utils/weakMaps'
import type {EditorActor} from '../editor-machine'
import {usePortableTextEditor} from '../hooks/usePortableTextEditor'
import {usePortableTextEditorReadOnlyStatus} from '../hooks/usePortableTextReadOnly'
import {useSyncValue} from '../hooks/useSyncValue'

const debug = debugWithName('component:PortableTextEditor:Synchronizer')
const debugVerbose = debug.enabled && false

// The editor will commit changes in a throttled fashion in order
// not to overload the network and degrade performance while typing.
const FLUSH_PATCHES_THROTTLED_MS = process.env.NODE_ENV === 'test' ? 500 : 1000

/**
 * @internal
 */
export interface SynchronizerProps {
  editorActor: EditorActor
  getValue: () => Array<PortableTextBlock> | undefined
  onChange: (change: EditorChange) => void
  value: Array<PortableTextBlock> | undefined
}

/**
 * Synchronizes the server value with the editor, and provides various contexts for the editor state.
 * @internal
 */
export function Synchronizer(props: SynchronizerProps) {
  const portableTextEditor = usePortableTextEditor()
  const readOnly = usePortableTextEditorReadOnlyStatus()
  const {editorActor, getValue, onChange, value} = props
  const pendingPatches = useRef<Patch[]>([])

  const syncValue = useSyncValue({
    editorActor,
    portableTextEditor,
    readOnly,
  })

  const slateEditor = useSlate()

  useEffect(() => {
    IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, false)
  }, [slateEditor])

  const onFlushPendingPatches = useCallback(() => {
    if (pendingPatches.current.length > 0) {
      debug('Flushing pending patches')
      if (debugVerbose) {
        debug(`Patches:\n${JSON.stringify(pendingPatches.current, null, 2)}`)
      }
      const snapshot = getValue()
      editorActor.send({
        type: 'mutation',
        patches: pendingPatches.current,
        snapshot,
      })
      pendingPatches.current = []
    }
    IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, false)
  }, [editorActor, slateEditor, getValue])

  // Flush pending patches immediately on unmount
  useEffect(() => {
    return () => {
      onFlushPendingPatches()
    }
  }, [onFlushPendingPatches])

  // We want to ensure that _when_ `props.onChange` is called, it uses the current value.
  // But we don't want to have the `useEffect` run setup + teardown + setup every time the prop might change, as that's unnecessary.
  // So we use our own polyfill that lets us use an upcoming React hook that solves this exact problem.
  // https://19.react.dev/learn/separating-events-from-effects#declaring-an-effect-event
  const handleChange = useEffectEvent((change: EditorChange) =>
    onChange(change),
  )

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    const onFlushPendingPatchesThrottled = throttle(
      () => {
        // If the editor is normalizing (each operation) it means that it's not in the middle of a bigger transform,
        // and we can flush these changes immediately.
        if (Editor.isNormalizing(slateEditor)) {
          onFlushPendingPatches()
          return
        }
        // If it's in the middle of something, try again.
        onFlushPendingPatchesThrottled()
      },
      FLUSH_PATCHES_THROTTLED_MS,
      {
        leading: false,
        trailing: true,
      },
    )

    debug('Subscribing to editor changes')
    const sub = editorActor.on('*', (event) => {
      switch (event.type) {
        case 'patch':
          IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, true)
          pendingPatches.current.push(event.patch)
          onFlushPendingPatchesThrottled()
          handleChange(event)
          break
        case 'loading': {
          handleChange({type: 'loading', isLoading: true})
          break
        }
        case 'done loading': {
          handleChange({type: 'loading', isLoading: false})
          break
        }
        case 'offline': {
          handleChange({type: 'connection', value: 'offline'})
          break
        }
        case 'online': {
          handleChange({type: 'connection', value: 'online'})
          break
        }
        case 'value changed': {
          handleChange({type: 'value', value: event.value})
          break
        }
        case 'invalid value': {
          handleChange({
            type: 'invalidValue',
            resolution: event.resolution,
            value: event.value,
          })
          break
        }
        case 'error': {
          handleChange({
            ...event,
            level: 'warning',
          })
          break
        }
        case 'patches': {
          break
        }
        default:
          handleChange(event)
      }
    })
    return () => {
      debug('Unsubscribing to changes')
      sub.unsubscribe()
    }
  }, [editorActor, handleChange, onFlushPendingPatches, slateEditor])

  // Sync the value when going online
  const handleOnline = useCallback(() => {
    debug('Editor is online, syncing from props.value')
    syncValue(value)
  }, [syncValue, value])

  // Notify about window online and offline status changes
  useEffect(() => {
    const subscription = editorActor.on('online', handleOnline)

    return () => {
      subscription.unsubscribe()
    }
  }, [handleOnline, editorActor])

  // This hook must be set up after setting up the subscription above, or it will not pick up validation errors from the useSyncValue hook.
  // This will cause the editor to not be able to signal a validation error and offer invalid value resolution of the initial value.
  const isInitialValueFromProps = useRef(true)
  useEffect(() => {
    debug('Value from props changed, syncing new value')
    syncValue(value)
    // Signal that we have our first value, and are ready to roll.
    if (isInitialValueFromProps.current) {
      editorActor.send({type: 'ready'})
      isInitialValueFromProps.current = false
    }
  }, [editorActor, syncValue, value])

  return null
}

Synchronizer.displayName = 'Synchronizer'
