import {createContext, useContext} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'

/**
 * React context propagating the IMMEDIATE PARENT's resolved container
 * config down the render tree. Undefined at the root level (top-level
 * elements have no parent container).
 *
 * Used to look up positional overrides via `parent.container.of` -
 * a child `_type` declared inside the parent's `of` is rendered using
 * that positional registration instead of the global one.
 *
 * Not a pipeline gate. Whether an unregistered text block at this
 * position wraps its children in the legacy extra `<div>` is governed
 * by `NewPipelineContext`, not by this context's truthiness.
 * A top-level catch-all `defineTextBlock` puts a render position inside
 * the new pipeline without any parent container — reading this
 * context's truthiness as a pipeline gate produces a stale answer for
 * top-level catch-all subtrees.
 */
export const ParentContainerContext = createContext<
  ContainerConfig | undefined
>(undefined)

export function useParentContainer() {
  return useContext(ParentContainerContext)
}
