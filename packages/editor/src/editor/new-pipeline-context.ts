import {createContext} from 'react'

/**
 * True when the current render position is inside a new-pipeline
 * subtree (any element rendered via `registerNode` and its descendants).
 *
 * Governs the one remaining text-block dispatch choice in
 * `render.element.tsx`: an unregistered text block at the top level
 * wraps its children in an extra `<div>` (`RenderTextBlock`); the same
 * position inside a new-pipeline subtree does not
 * (`renderDefaultTextBlock`). Every other node kind now emits the same
 * DOM whether registered or not, so this context no longer affects
 * them.
 *
 * Provided by `useChildren` (wrapping each new-pipeline child).
 */
export const NewPipelineContext = createContext<boolean>(false)
