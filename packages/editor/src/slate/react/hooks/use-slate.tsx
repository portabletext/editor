import {useContext, useLayoutEffect, useReducer} from 'react'
import type {Editor} from '../../interfaces/editor'
import {SlateSelectorContext} from './use-slate-selector'
import {useSlateStatic} from './use-slate-static'

/**
 * Get the current editor object and re-render whenever it changes.
 */

export const useSlate = (): Editor => {
  const {addEventListener} = useContext(SlateSelectorContext)
  const [, forceRender] = useReducer((s) => s + 1, 0)

  if (!addEventListener) {
    throw new Error(
      `The \`useSlate\` hook must be used inside the <Slate> component's context.`,
    )
  }

  useLayoutEffect(() => addEventListener(forceRender), [addEventListener])

  return useSlateStatic()
}
