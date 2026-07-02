import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from 'react'

/** Min width per column before the table scrolls horizontally (IX10). */
export const MIN_COL_PX = 140
export const SCROLL_PADDING_BOTTOM = 12

const EDGE_EPSILON = 2

/**
 * Hybrid column width (IX10): columns share the width equally while the field
 * fits; fixed min column width plus horizontal scroll inside the table
 * container once `colCount x MIN_COL_PX` exceeds the scrollport.
 */
export function useTableHorizontalLayout(
  scrollRef: RefObject<HTMLDivElement | null>,
  colCount: number,
  revision: string,
): boolean {
  const [enforceMinColumnWidth, setEnforceMinColumnWidth] = useState(false)

  const measure = useCallback(() => {
    const element = scrollRef.current
    if (!element || colCount < 1) {
      setEnforceMinColumnWidth(false)
      return
    }
    const minTableWidth = colCount * MIN_COL_PX
    const next = minTableWidth > element.clientWidth + EDGE_EPSILON
    setEnforceMinColumnWidth((prev) => (prev === next ? prev : next))
  }, [scrollRef, colCount])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) {
      observer.observe(element.firstElementChild)
    }
    return () => {
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [scrollRef, measure, revision])

  return enforceMinColumnWidth
}

/** Left/right fade hints when the horizontal scrollport overflows. */
export function useScrollFade(
  scrollRef: RefObject<HTMLDivElement | null>,
  revision: string,
): {left: boolean; right: boolean} {
  const [fade, setFade] = useState({left: false, right: false})

  const measure = useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      setFade({left: false, right: false})
      return
    }
    const {scrollLeft, scrollWidth, clientWidth} = element
    const overflows = scrollWidth > clientWidth + EDGE_EPSILON
    setFade((prev) => {
      const next = {
        left: overflows && scrollLeft > EDGE_EPSILON,
        right:
          overflows && scrollLeft + clientWidth < scrollWidth - EDGE_EPSILON,
      }
      return prev.left === next.left && prev.right === next.right ? prev : next
    })
  }, [scrollRef])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    measure()
    element.addEventListener('scroll', measure, {passive: true})
    window.addEventListener('resize', measure)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (element.firstElementChild) {
      observer.observe(element.firstElementChild)
    }
    return () => {
      element.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [scrollRef, measure, revision])

  return fade
}
