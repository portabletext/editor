import {useEffect, useRef} from 'react'

/**
 * Wire pointer-based swipe gestures to slide navigation.
 *
 * Touch and mouse-drag both work. A horizontal-dominant gesture of at
 * least 60 CSS pixels advances or retreats one slide. Gestures starting
 * on an element with `data-deck-no-swipe` (code blocks, tables, modals,
 * the value inspector) are ignored so the user can pan those regions
 * freely without triggering nav.
 *
 * The hook attaches to whichever element ref is returned. Add the ref to
 * a wrapper around the deck's editable surface.
 */
export function useSwipeNavigation(props: {
  onNext: () => void
  onPrev: () => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const onNextRef = useRef(props.onNext)
  const onPrevRef = useRef(props.onPrev)

  useEffect(() => {
    onNextRef.current = props.onNext
    onPrevRef.current = props.onPrev
  }, [props.onNext, props.onPrev])

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }

    let startX = 0
    let startY = 0
    let startTime = 0
    let trackingPointerId: number | null = null
    let active = false

    const isPanRegion = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return false
      }
      return target.closest('[data-deck-no-swipe]') !== null
    }

    const onPointerDown = (event: PointerEvent) => {
      // Touch + pen only - mouse-drag would interfere with caret placement
      // and text selection. Desktop users have arrow keys + chrome buttons.
      if (event.pointerType === 'mouse') {
        return
      }
      if (isPanRegion(event.target)) {
        return
      }
      active = true
      startX = event.clientX
      startY = event.clientY
      startTime = event.timeStamp
      trackingPointerId = event.pointerId
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!active || event.pointerId !== trackingPointerId) {
        return
      }
      active = false
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      const elapsed = event.timeStamp - startTime

      // Real swipes are fast horizontal flicks. Selections, taps, and
      // long presses fail one of these three filters.
      if (elapsed > 500) {
        return
      }
      if (absX < 60 || absX < absY * 1.4) {
        return
      }
      if (dx < 0) {
        onNextRef.current()
      } else {
        onPrevRef.current()
      }
    }

    const onPointerCancel = () => {
      active = false
    }

    el.addEventListener('pointerdown', onPointerDown, {passive: true})
    el.addEventListener('pointerup', onPointerUp, {passive: true})
    el.addEventListener('pointercancel', onPointerCancel, {passive: true})

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [])

  return ref
}
