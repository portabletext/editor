import {useSelector} from '@xstate/react'
import {useContext, useMemo} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import {
  getRendererKey,
  type RendererConfig,
  type RendererType,
} from './renderer.types'

/**
 * Result of evaluating renderer guards
 */
export interface RendererMatch {
  renderer: RendererConfig
  guardResponse: unknown
}

// Stable empty array reference to avoid unnecessary re-renders
const EMPTY_RENDERERS: ReadonlyArray<RendererConfig> = []

/**
 * @internal
 * Get all registered renderers for a given type and name.
 * Returns an array of renderers that may compete via guards.
 */
export function useRenderers(
  type: RendererType,
  name: string,
): ReadonlyArray<RendererConfig> {
  const editorActor = useContext(EditorActorContext)
  const key = getRendererKey(type, name)

  const renderersArray = useSelector(
    editorActor,
    (snapshot) => snapshot.context.renderers.get(key) ?? EMPTY_RENDERERS,
  )

  return renderersArray
}

/**
 * @internal
 * Get all registered renderers from the editor context (flattened)
 */
export function useAllRenderers(): ReadonlyArray<RendererConfig> {
  const editorActor = useContext(EditorActorContext)
  const renderersMap = useSelector(editorActor, (s) => s.context.renderers)

  // Memoize the array flattening to maintain stable reference
  return useMemo(() => Array.from(renderersMap.values()).flat(), [renderersMap])
}

/**
 * @internal
 * Evaluate renderer guards and find the first matching renderer.
 * This should be called from render components that have access to the node.
 * The getSnapshot function is only called when a guard needs to be evaluated.
 */
export function findMatchingRenderer(
  renderers: ReadonlyArray<RendererConfig>,
  node: unknown,
  getSnapshot: () => EditorSnapshot,
): RendererMatch | undefined {
  for (const renderer of renderers) {
    // If no guard, it always matches (implicit () => true)
    if (!renderer.renderer.guard) {
      return {renderer, guardResponse: true}
    }

    // Evaluate the guard - only compute snapshot when needed
    const guardResponse = renderer.renderer.guard({
      node,
      snapshot: getSnapshot(),
    })

    // If guard returns truthy, this renderer handles it
    if (guardResponse !== false) {
      return {renderer, guardResponse}
    }
  }

  return undefined
}
