import {useSelector} from '@xstate/react'
import {useContext} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {RendererConfig} from './renderer.types'
import {getRendererKey} from './renderer.types'

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
