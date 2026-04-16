import type {MutableRefObject} from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {IS_ANDROID} from '../../dom/utils/environment'
import type {Editor} from '../../interfaces/editor'

// Delay the placeholder on Android to prevent the keyboard from closing.
const PLACEHOLDER_DELAY = IS_ANDROID ? 300 : 0

type TimerId = ReturnType<typeof setTimeout> | null

/**
 * Manages the leaf placeholder lifecycle: tracking when to show it (with a
 * platform-appropriate delay), observing size changes on the placeholder
 * element, and keeping `editor.domPlaceholderElement` in sync.
 */
export function useLeafPlaceholder(
  editor: Editor,
  leaf: unknown,
  leafIsPlaceholder: boolean,
): {
  callbackPlaceholderRef: (placeholderEl: HTMLElement | null) => void
  showPlaceholder: boolean
} {
  const placeholderResizeObserver = useRef<ResizeObserver | null>(null)
  const placeholderRef = useRef<HTMLElement | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const showPlaceholderTimeoutRef: MutableRefObject<TimerId> =
    useRef<TimerId>(null)

  const callbackPlaceholderRef = useCallback(
    (placeholderEl: HTMLElement | null) => {
      if (placeholderResizeObserver.current) {
        placeholderResizeObserver.current.disconnect()
        if (placeholderEl == null) {
          placeholderResizeObserver.current = null
        }
      }

      if (placeholderEl == null) {
        editor.domPlaceholderElement = null
        ;(leaf as any).onPlaceholderResize?.(null)
      } else {
        editor.domPlaceholderElement = placeholderEl

        if (!placeholderResizeObserver.current) {
          placeholderResizeObserver.current = new ResizeObserver(() => {
            ;(leaf as any).onPlaceholderResize?.(placeholderEl)
          })
        }
        placeholderResizeObserver.current.observe(placeholderEl)
        placeholderRef.current = placeholderEl
      }
    },
    [placeholderRef, leaf, editor],
  )

  useEffect(() => {
    if (leafIsPlaceholder) {
      if (!showPlaceholderTimeoutRef.current) {
        showPlaceholderTimeoutRef.current = setTimeout(() => {
          setShowPlaceholder(true)
          showPlaceholderTimeoutRef.current = null
        }, PLACEHOLDER_DELAY)
      }
    } else {
      if (showPlaceholderTimeoutRef.current) {
        clearTimeout(showPlaceholderTimeoutRef.current)
        showPlaceholderTimeoutRef.current = null
      }
      setShowPlaceholder(false)
    }
    return () => {
      if (showPlaceholderTimeoutRef.current) {
        clearTimeout(showPlaceholderTimeoutRef.current)
        showPlaceholderTimeoutRef.current = null
      }
    }
  }, [leafIsPlaceholder])

  return {callbackPlaceholderRef, showPlaceholder}
}
