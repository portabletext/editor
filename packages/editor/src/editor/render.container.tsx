import type {PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {RenderElementProps} from '../slate/react/components/editable'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
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
