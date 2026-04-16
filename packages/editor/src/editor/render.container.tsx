import type {PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
  path: Path
}) {
  const {'data-slate-node': _slateNode, ...restAttributes} = props.attributes
  const containerAttributes = {
    ...restAttributes,
    'data-pt-container': '',
  }

  if (props.containerConfig.container.render) {
    const rendered = props.containerConfig.container.render({
      attributes: containerAttributes,
      children: props.children,
      node: props.element,
      path: props.path,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return <div {...containerAttributes}>{props.children}</div>
}
