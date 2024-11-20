import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import {throttle} from 'lodash'
import {useCallback, useEffect, useRef} from 'react'
import {Editor as SlateEditor} from 'slate'
import {useSlate} from 'slate-react'
import {debugWithName} from '../../utils/debug'
import {IS_PROCESSING_LOCAL_CHANGES} from '../../utils/weakMaps'
import type {Editor} from '../create-editor'
import {useSyncValue} from '../hooks/useSyncValue'
import type {PortableTextEditor} from '../PortableTextEditor'

const debug = debugWithName('component:PortableTextEditor:Synchronizer')
const debugVerbose = debug.enabled && false

// The editor will commit changes in a throttled fashion in order
// not to overload the network and degrade performance while typing.
const FLUSH_PATCHES_THROTTLED_MS = process.env.NODE_ENV === 'test' ? 500 : 1000

/**
 * @internal
 */
export interface SynchronizerProps {
  editor: Editor
  portableTextEditor: PortableTextEditor
  getValue: () => Array<PortableTextBlock> | undefined
}

/**
 * Synchronizes the server value with the editor, and provides various contexts for the editor state.
 * @internal
 */
export function Synchronizer(props: SynchronizerProps) {
  const readOnly = useSelector(
    props.editor._internal.editorActor,
    (s) => s.context.readOnly,
  )
  const value = useSelector(
    props.editor._internal.editorActor,
    (s) => s.context.value,
  )
  const pendingPatches = useRef<Patch[]>([])

  const syncValue = useSyncValue({
    editorActor: props.editor._internal.editorActor,
    portableTextEditor: props.portableTextEditor,
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
      const snapshot = props.getValue()
      props.editor._internal.editorActor.send({
        type: 'mutation',
        patches: pendingPatches.current,
        snapshot,
      })
      pendingPatches.current = []
    }
    IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, false)
  }, [props.editor, slateEditor, props.getValue])

  // Flush pending patches immediately on unmount
  useEffect(() => {
    return () => {
      onFlushPendingPatches()
    }
  }, [onFlushPendingPatches])

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    const onFlushPendingPatchesThrottled = throttle(
      () => {
        // If the editor is normalizing (each operation) it means that it's not in the middle of a bigger transform,
        // and we can flush these changes immediately.
        if (SlateEditor.isNormalizing(slateEditor)) {
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
    const sub = props.editor.on('*', (event) => {
      switch (event.type) {
        case 'patch':
          IS_PROCESSING_LOCAL_CHANGES.set(slateEditor, true)
          pendingPatches.current.push(event.patch)
          onFlushPendingPatchesThrottled()
          break
      }
    })
    return () => {
      debug('Unsubscribing to changes')
      sub.unsubscribe()
    }
  }, [props.editor, onFlushPendingPatches, slateEditor])

  // This hook must be set up after setting up the subscription above, or it will not pick up validation errors from the useSyncValue hook.
  // This will cause the editor to not be able to signal a validation error and offer invalid value resolution of the initial value.
  const isInitialValueFromProps = useRef(true)
  useEffect(() => {
    debug('Value from props changed, syncing new value')
    syncValue(value)
    // Signal that we have our first value, and are ready to roll.
    if (isInitialValueFromProps.current) {
      props.editor._internal.editorActor.send({type: 'ready'})
      isInitialValueFromProps.current = false
    }
  }, [props.editor, syncValue, value])

  return null
}

Synchronizer.displayName = 'Synchronizer'
