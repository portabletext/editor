import {createContext, useCallback, useContext, useMemo, useRef} from 'react'
import type {Editor} from '../../interfaces/editor'
import {useGenericSelector} from './use-generic-selector'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'
import {useSlateStatic} from './use-slate-static'

type Callback = () => void

/**
 * A React context for sharing the editor selector context in a way to control
 * re-renders.
 */

export const SlateSelectorContext = createContext<{
  addEventListener: (callback: Callback) => () => void
  flushDeferred: () => void
}>({} as any)

const refEquality = (a: any, b: any) => a === b

/**
 * Use redux style selectors to prevent re-rendering on every keystroke.
 *
 * Bear in mind re-rendering can only prevented if the returned value is a value
 * type or for reference types (e.g. objects and arrays) add a custom equality
 * function.
 *
 * If `selector` is memoized using `useCallback`, then it will only be called
 * when it or the editor state changes. Otherwise, `selector` will be called
 * every time the component renders.
 *
 * @example
 * const isSelectionActive = useSlateSelector(editor => Boolean(editor.selection))
 */

export function useSlateSelector<T>(
  selector: (editor: Editor) => T,
  equalityFn: (a: T | null, b: T) => boolean = refEquality,
): T {
  const context = useContext(SlateSelectorContext)
  if (!context) {
    throw new Error(
      `The \`useSlateSelector\` hook must be used inside the <Slate> component's context.`,
    )
  }
  const {addEventListener} = context

  const editor = useSlateStatic()
  const genericSelector = useCallback(
    () => selector(editor),
    [editor, selector],
  )
  const [selectedState, update] = useGenericSelector(
    genericSelector,
    equalityFn,
  )

  useIsomorphicLayoutEffect(() => {
    const unsubscribe = addEventListener(update)
    update()
    return unsubscribe
  }, [addEventListener, update])

  return selectedState
}

/**
 * Create selector context with editor updating on every editor change
 */
export function useSelectorContext() {
  const eventListeners = useRef(new Set<Callback>())
  const deferredEventListeners = useRef(new Set<Callback>())

  const onChange = useCallback(() => {
    eventListeners.current.forEach((listener) => {
      listener()
    })
  }, [])

  const flushDeferred = useCallback(() => {
    deferredEventListeners.current.forEach((listener) => {
      listener()
    })
    deferredEventListeners.current.clear()
  }, [])

  const addEventListener = useCallback((callbackProp: Callback) => {
    eventListeners.current.add(callbackProp)

    return () => {
      eventListeners.current.delete(callbackProp)
    }
  }, [])

  const selectorContext = useMemo(
    () => ({
      addEventListener,
      flushDeferred,
    }),
    [addEventListener, flushDeferred],
  )

  return {selectorContext, onChange}
}

export function useFlushDeferredSelectorsOnRender() {
  const {flushDeferred} = useContext(SlateSelectorContext)
  useIsomorphicLayoutEffect(flushDeferred)
}
