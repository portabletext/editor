import {useEffect, useLayoutEffect, useState, type RefObject} from 'react'

export function useMutationObserver(
  node: RefObject<HTMLElement>,
  callback: MutationCallback,
  options: MutationObserverInit,
) {
  const [mutationObserver] = useState(() => new MutationObserver(callback))

  useLayoutEffect(() => {
    // Discard mutations caused during render phase. This works due to react calling
    // useLayoutEffect synchronously after the render phase before the next tick.
    mutationObserver.takeRecords()
  })

  useEffect(() => {
    if (!node.current) {
      throw new Error('Failed to attach MutationObserver, `node` is undefined')
    }

    mutationObserver.observe(node.current, options)
    return () => mutationObserver.disconnect()
  }, [mutationObserver, node, options])
}
