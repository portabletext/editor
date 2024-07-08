import {type Patch} from '@portabletext/patches'
import {type PortableTextBlock} from '@sanity/types'
import {throttle} from 'lodash'
import {useCallback, useEffect, useMemo, useRef} from 'react'
import {Editor} from 'slate'
import {useSlate} from 'slate-react'

import {type EditorChange, type EditorChanges} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {IS_PROCESSING_LOCAL_CHANGES} from '../../utils/weakMaps'
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
  change$: EditorChanges
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
  const {change$, getValue, onChange, value} = props
  const pendingPatches = useRef<Patch[]>([])

  const syncValue = useSyncValue({
    keyGenerator,
    onChange,
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
      change$.next({type: 'mutation', patches: pendingPatches.current, snapshot})
      pendingPatches.current = []
    }
    IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, false)
  }, [slateEditor, getValue, change$])

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
    debug('Subscribing to editor changes$')
    const sub = change$.subscribe((next: EditorChange): void => {
      switch (next.type) {
        case 'patch':
          IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, true)
          pendingPatches.current.push(next.patch)
          onFlushPendingPatchesThrottled()
          onChange(next)
          break
        default:
          onChange(next)
      }
    })
    return () => {
      debug('Unsubscribing to changes$')
      sub.unsubscribe()
    }
  }, [change$, onChange, onFlushPendingPatchesThrottled, slateEditor])

  // Sync the value when going online
  const handleOnline = useCallback(() => {
    debug('Editor is online, syncing from props.value')
    change$.next({type: 'connection', value: 'online'})
    syncValue(value)
  }, [change$, syncValue, value])

  const handleOffline = useCallback(() => {
    debug('Editor is offline')
    change$.next({type: 'connection', value: 'offline'})
  }, [change$])

  // Notify about window online and offline status changes
  useEffect(() => {
    if (portableTextEditor.props.patches$) {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
    return () => {
      if (portableTextEditor.props.patches$) {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  })

  // This hook must be set up after setting up the subscription above, or it will not pick up validation errors from the useSyncValue hook.
  // This will cause the editor to not be able to signal a validation error and offer invalid value resolution of the initial value.
  const isInitialValueFromProps = useRef(true)
  useEffect(() => {
    debug('Value from props changed, syncing new value')
    syncValue(value)
    // Signal that we have our first value, and are ready to roll.
    if (isInitialValueFromProps.current) {
      change$.next({type: 'loading', isLoading: false})
      change$.next({type: 'ready'})
      isInitialValueFromProps.current = false
    }
  }, [change$, syncValue, value])

  return null
}
