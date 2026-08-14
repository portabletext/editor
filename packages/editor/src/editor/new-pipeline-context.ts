import {createContext} from 'react'

/**
 * True when the current render position is inside a new-pipeline
 * subtree (any element rendered via `registerNode` and its descendants).
 *
 * Governs whether the dispatch sites in `render.element.tsx` /
 * `render.text.tsx` emit the legacy DOM shape (`data-child-*`
 * attributes, legacy default renderers) or the new-pipeline shape.
 *
 * Provided by `useChildren` (wrapping each new-pipeline child) and by
 * the dispatch sites in `render.element.tsx` / `render.span.tsx`.
 */
export const NewPipelineContext = createContext<boolean>(false)
