import {createContext} from 'react'
import type {
  RenderAnnotationFunction,
  RenderDecoratorFunction,
  RenderPlaceholderFunction,
} from '../types/editor'

export const RenderMarkContext = createContext<{
  renderDecorator?: RenderDecoratorFunction
  renderAnnotation?: RenderAnnotationFunction
  renderPlaceholder?: RenderPlaceholderFunction
}>({})
