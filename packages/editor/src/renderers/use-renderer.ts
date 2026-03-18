import {useSelector} from '@xstate/react'
import {useContext} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {RendererConfig} from './renderer.types'
import {getRendererKey} from './renderer.types'

/**
 * Look up a registered renderer by type and name, with optional scope.
 * When a scope is provided, the most specific scoped name is checked first,
 * then falls back to the unscoped name.
 *
 * For example, with name='row' and scope='table':
 *   1. Check 'blockObject:table.row'
 *   2. Fall back to 'blockObject:row'
 */
export function useRenderer(
  type: string,
  name: string,
  scope?: string,
): RendererConfig | undefined {
  const editorActor = useContext(EditorActorContext)

  return useSelector(editorActor, (snapshot) => {
    if (!snapshot) {
      return undefined
    }

    const renderers = snapshot.context.renderers

    if (scope) {
      const scopedKey = getRendererKey(type, `${scope}.${name}`)
      const scopedRenderer = renderers.get(scopedKey)

      if (scopedRenderer) {
        return scopedRenderer
      }
    }

    const unscopedKey = getRendererKey(type, name)
    return renderers.get(unscopedKey)
  })
}
