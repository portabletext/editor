import type {PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'

/**
 * @internal
 */
export type Renderer = {
  type: string
  render: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    node: PortableTextObject
  }) => ReactElement
}

/**
 * @internal
 */
export type ContainerConfig = {
  renderer: Renderer
}
