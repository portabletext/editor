import type {PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'

/**
 * @public
 */
export type Renderer = {
  type: 'blockObject'
  name: string
  render: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    node: PortableTextObject
  }) => ReactElement
}

/**
 * @public
 */
export type RendererConfig = {
  renderer: Renderer
}

export function getRendererKey(type: string, name: string): string {
  return `${type}:${name}`
}
