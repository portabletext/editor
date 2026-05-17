import {createContext} from 'react'
import type {TextBlockConfig} from '../renderers/renderer.types'

/**
 * The active text block's resolved config at this render position.
 * Provided by the text-block render branch in `render.element.tsx`;
 * consumed by inline-level dispatch (`useSpanConfig` + the
 * inline-object branch of `render.element.tsx`) for positional
 * override lookup.
 *
 * Separate from `ParentContainerContext` so inline subscribers only
 * re-render on text-block `of` changes, and block subscribers only
 * re-render on container `of` changes.
 */
export const ParentTextBlockContext = createContext<
  TextBlockConfig | undefined
>(undefined)
