import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {throttle} from 'lodash'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editor} from 'slate'
import {useSlate} from 'slate-react'
import type {EditorChange} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {IS_PROCESSING_LOCAL_CHANGES} from '../../utils/weakMaps'
import type {EditorActor} from '../editor-machine'
import {usePortableTextEditor} from '../hooks/usePortableTextEditor'
import {usePortableTextEditorKeyGenerator} from '../hooks/usePortableTextEditorKeyGenerator'
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
  const keyGenerator = usePortableTextEditorKeyGenerator()
  const readOnly = usePortableTextEditorReadOnlyStatus()
  const {editorActor, getValue, onChange, value} = props
  const pendingPatches = useRef<Patch[]>([])

  const syncValue = useSyncValue({
    editorActor,
    keyGenerator,
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

  const onFlushPendingPatchesThrottled = useMemo(() => {
    return throttle(
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
  }, [onFlushPendingPatches, slateEditor])

  // Flush pending patches immediately on unmount
  useEffect(() => {
    return () => {
      onFlushPendingPatches()
    }
  }, [onFlushPendingPatches])

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    debug('Subscribing to editor changes')
    const sub = editorActor.on('*', (event) => {
      switch (event.type) {
        case 'patch':
          IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, true)
          pendingPatches.current.push(event.patch)
          onFlushPendingPatchesThrottled()
          onChange(event)
          break
        case 'loading': {
          onChange({type: 'loading', isLoading: true})
          break
        }
        case 'done loading': {
          onChange({type: 'loading', isLoading: false})
          break
        }
        case 'offline': {
          onChange({type: 'connection', value: 'offline'})
          break
        }
        case 'online': {
          onChange({type: 'connection', value: 'online'})
          break
        }
        case 'value changed': {
          onChange({type: 'value', value: event.value})
          break
        }
        case 'invalid value': {
          onChange({
            type: 'invalidValue',
            resolution: event.resolution,
            value: event.value,
          })
          break
        }
        case 'error': {
          onChange({
            ...event,
            level: 'warning',
          })
          break
        }
        default:
          onChange(event)
      }
    })
    return () => {
      debug('Unsubscribing to changes')
      sub.unsubscribe()
    }
  }, [editorActor, onFlushPendingPatchesThrottled, slateEditor])

  // Sync the value when going online
  const handleOnline = useCallback(() => {
    debug('Editor is online, syncing from props.value')
    syncValue(value)
  }, [syncValue, value])

  // Notify about window online and offline status changes
  useEffect(() => {
    const subscription = editorActor.on('online', () => {
      if (portableTextEditor.props.patches$) {
        handleOnline()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editorActor])

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
