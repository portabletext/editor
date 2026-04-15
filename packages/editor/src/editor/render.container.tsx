import type {PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'

export function RenderContainer(props: {
  attributes: {
    'data-pt-container': ''
    'data-pt-path': string
    'dir'?: 'rtl'
  }
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
}) {
  if (props.containerConfig.container.render) {
    const rendered = props.containerConfig.container.render({
      attributes: props.attributes,
      children: props.children,
      node: props.element,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return <div {...props.attributes}>{props.children}</div>
}
