import {createContext} from 'react'

/**
 * Tracks the currently visible slide.
 *
 * The deck renders all slides as part of a single Portable Text document.
 * Only one slide is visible at a time - the rest are hidden via CSS. The
 * `currentIndex` here drives which slide gets the active styling; the
 * `slideKeys` array lets each slide work out its own index from its `_key`.
 */
export const SlideIndexContext = createContext<{
  currentIndex: number
  slideKeys: ReadonlyArray<string>
}>({
  currentIndex: 0,
  slideKeys: [],
})
