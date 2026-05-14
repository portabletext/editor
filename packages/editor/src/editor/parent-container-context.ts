import {createContext, useContext} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'

/**
 * React context propagating the IMMEDIATE PARENT's resolved container
 * config down the render tree. Undefined at the root level (top-level
 * elements have no parent container).
 *
 * Consumers use this to:
 *   - Check whether they're nested inside a container (truthiness check),
 *     which gates the editing-/pt-attribute split in the render pipeline.
 *   - Look up positional overrides via `parent.container.of` - a child
 *     `_type` declared inside parent's `of` is rendered using that
 *     positional registration instead of the global one.
 */
export const ParentContainerContext = createContext<
  ContainerConfig | undefined
>(undefined)

export function useParentContainer() {
  return useContext(ParentContainerContext)
}
