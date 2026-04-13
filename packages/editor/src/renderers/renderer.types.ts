import type {PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'

/**
 * @internal
 */
export type Renderer = {
  type: string
  render: (props: {
    attributes: Record<string, unknown>
    children: Record<string, ReactElement>
    value: PortableTextBlock
  }) => ReactElement
}

/**
 * @internal
 */
export type RendererConfig = {
  renderer: Renderer
}
