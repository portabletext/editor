import {createContext} from 'react'

/**
 * True when the current render position is inside a new-pipeline
 * subtree (any element rendered via `registerNode` and its descendants).
 *
 * Read by the legacy DOM-attribute emission sites in `element.tsx`,
 * `object-node.tsx`, `text.tsx`, `leaf.tsx`, and `string.tsx` to skip
 * `data-slate-*` attributes inside new-pipeline subtrees while still
 * emitting them in the legacy pipeline.
 *
 * Provided by `useChildren` (wrapping each new-pipeline child) and by
 * the dispatch sites in `render.element.tsx` / `render.span.tsx`.
 */
export const NewPipelineContext = createContext<boolean>(false)
