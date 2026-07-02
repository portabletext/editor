import {createContext, useCallback, useContext, useMemo, useRef} from 'react'
import type {Editor} from '../../interfaces/editor'
import {useEngineStatic} from './use-engine-static'
import {useGenericSelector} from './use-generic-selector'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'

type Callback = () => void

/**
 * Which editor state a selector depends on, so the notify dispatch can
 * skip listeners whose inputs cannot have changed. 'registrations'
 * fires only when a renderer registration map is swapped
 * (`register-node-on-engine.ts`, the sole mutation site); 'listIndex'
 * fires only when a flush contained a structural operation (the same
 * signal that invalidates `listIndexMap`). Omitted means every editor
 * change, the previous behavior for all listeners.
 */
type EngineSelectorChannel = 'registrations' | 'listIndex'

/**
 * A React context for sharing the editor selector context in a way to control
 * re-renders.
 */

export const EngineSelectorContext = createContext<{
  addEventListener: (
    callback: Callback,
    channel?: EngineSelectorChannel,
  ) => () => void
}>({} as any)

const refEquality = (a: any, b: any) => a === b

/**
 * `useEngineSelector` scoped to the 'registrations' channel: the
 * selector re-runs on its component's renders and when a renderer
 * registration map is swapped, not on document or selection changes.
 * Only for selectors that read the registration maps
 * (`engine.containers/spans/textBlocks/blockObjects/inlineObjects`)
 * exclusively; those maps are mutated only in
 * `register-node-on-engine.ts`, which arms this channel.
 */
export function useRegistrationsSelector<T>(
  selector: (editor: Editor) => T,
  equalityFn: (a: T | null, b: T) => boolean = refEquality,
): T {
  return useChannelSelector(selector, equalityFn, 'registrations')
}

/**
 * `useEngineSelector` scoped to the 'listIndex' channel: the selector
 * re-runs on its component's renders and when a flush contained a
 * structural operation (the same signal that invalidates
 * `listIndexMap`), not on text or selection changes. Only for
 * selectors that read `getListIndexMap`.
 */
export function useListIndexSelector<T>(
  selector: (editor: Editor) => T,
  equalityFn: (a: T | null, b: T) => boolean = refEquality,
): T {
  return useChannelSelector(selector, equalityFn, 'listIndex')
}

function useChannelSelector<T>(
  selector: (editor: Editor) => T,
  equalityFn: (a: T | null, b: T) => boolean,
  channel: EngineSelectorChannel,
): T {
  const context = useContext(EngineSelectorContext)
  if (!context) {
    throw new Error(
      `The \`useEngineSelector\` hook must be used inside the <Engine> component's context.`,
    )
  }
  const {addEventListener} = context

  const editor = useEngineStatic()
  const genericSelector = useCallback(
    () => selector(editor),
    [editor, selector],
  )
  const [selectedState, update] = useGenericSelector(
    genericSelector,
    equalityFn,
  )

  useIsomorphicLayoutEffect(() => {
    const unsubscribe = addEventListener(update, channel)
    update()
    return unsubscribe
  }, [addEventListener, update, channel])

  return selectedState
}

/**
 * Create selector context with editor updating on every editor change.
 *
 * Listeners live in per-channel sets so a change only reaches the
 * selectors whose inputs it can affect: with thousands of blocks each
 * holding channel-scoped subscriptions, notifying all of them on every
 * keystroke and selection move dominated per-event cost.
 */
export function useSelectorContext() {
  const eventListeners = useRef(new Set<Callback>())
  const registrationListeners = useRef(new Set<Callback>())
  const listIndexListeners = useRef(new Set<Callback>())

  const onChange = useCallback(
    (changed: {registrations: boolean; listIndex: boolean}) => {
      eventListeners.current.forEach((listener) => {
        listener()
      })
      if (changed.registrations) {
        registrationListeners.current.forEach((listener) => {
          listener()
        })
      }
      if (changed.listIndex) {
        listIndexListeners.current.forEach((listener) => {
          listener()
        })
      }
    },
    [],
  )

  const addEventListener = useCallback(
    (callbackProp: Callback, channel?: EngineSelectorChannel) => {
      const listeners =
        channel === 'registrations'
          ? registrationListeners.current
          : channel === 'listIndex'
            ? listIndexListeners.current
            : eventListeners.current
      listeners.add(callbackProp)

      return () => {
        listeners.delete(callbackProp)
      }
    },
    [],
  )

  const selectorContext = useMemo(
    () => ({
      addEventListener,
    }),
    [addEventListener],
  )

  return {selectorContext, onChange}
}
