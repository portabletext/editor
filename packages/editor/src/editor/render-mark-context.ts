import {createContext} from 'react'
import type {
  RenderAnnotationFunction,
  RenderDecoratorFunction,
} from '../types/editor'

export const RenderMarkContext = createContext<{
  renderDecorator?: RenderDecoratorFunction
  renderAnnotation?: RenderAnnotationFunction
}>({})
