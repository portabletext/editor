import {useContext, useReducer} from 'react'
import type {Editor} from '../../interfaces/editor'
import {EngineSelectorContext} from './use-engine-selector'
import {useEngineStatic} from './use-engine-static'
import {useIsomorphicLayoutEffect} from './use-isomorphic-layout-effect'

/**
 * Get the current editor object and re-render whenever it changes.
 */

export const useEngine = (): Editor => {
  const {addEventListener} = useContext(EngineSelectorContext)
  const [, forceRender] = useReducer((s) => s + 1, 0)

  if (!addEventListener) {
    throw new Error(
      `The \`useEngine\` hook must be used inside the <Engine> component's context.`,
    )
  }

  useIsomorphicLayoutEffect(
    () => addEventListener(forceRender),
    [addEventListener],
  )

  return useEngineStatic()
}
