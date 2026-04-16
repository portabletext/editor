import {createContext} from 'react'
import type {
  RenderChildFunction,
  RenderPlaceholderFunction,
} from '../types/editor'

export const RenderLegacyCallbacksContext = createContext<{
  renderChild?: RenderChildFunction
  renderPlaceholder?: RenderPlaceholderFunction
}>({})
