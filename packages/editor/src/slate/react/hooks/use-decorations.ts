import {isSpan} from '@portabletext/schema'
import {createContext, useCallback, useContext, useMemo, useRef} from 'react'
import {
  isElementDecorationsEqual,
  isTextDecorationsEqual,
} from '../../dom/utils/range-list'
import type {Node, NodeEntry} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'
import {useGenericSelector} from './use-generic-selector'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'
import {useSlateStatic} from './use-slate-static'

type Callback = () => void

/**
 * A React context for sharing the `decorate` prop of the editable and
 * subscribing to changes on this prop.
 */

export const DecorateContext = createContext<{
  decorate: (entry: NodeEntry) => DecoratedRange[]
  addEventListener: (callback: Callback) => () => void
}>({} as any)

export const useDecorations = (
  node: Node,
  path: Path,
  parentDecorations: DecoratedRange[],
): DecoratedRange[] => {
  const editor = useSlateStatic()
  const {decorate, addEventListener} = useContext(DecorateContext)

  // Not memoized since we want nodes to be decorated on each render
  const selector = () => {
    return decorate([node, path])
  }

  const equalityFn = isSpan({schema: editor.schema}, node)
    ? isTextDecorationsEqual
    : isElementDecorationsEqual

  const [decorations, update] = useGenericSelector(selector, equalityFn)

  useIsomorphicLayoutEffect(() => {
    const unsubscribe = addEventListener(update)
    update()
    return unsubscribe
  }, [addEventListener, update])

  return useMemo(
    () => [...decorations, ...parentDecorations],
    [decorations, parentDecorations],
  )
}

export const useDecorateContext = (
  decorateProp: (entry: NodeEntry) => DecoratedRange[],
) => {
  const eventListeners = useRef(new Set<Callback>())

  const latestDecorate = useRef(decorateProp)

  useIsomorphicLayoutEffect(() => {
    latestDecorate.current = decorateProp
    eventListeners.current.forEach((listener) => {
      listener()
    })
  }, [decorateProp])

  const decorate = useCallback(
    (entry: NodeEntry) => latestDecorate.current(entry),
    [],
  )

  const addEventListener = useCallback((callback: Callback) => {
    eventListeners.current.add(callback)

    return () => {
      eventListeners.current.delete(callback)
    }
  }, [])

  return useMemo(
    () => ({decorate, addEventListener}),
    [decorate, addEventListener],
  )
}
