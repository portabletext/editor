import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {
  ContainerConfig,
  ContainerRenderProps,
} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {renderDefaultContainer} from './render.default'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
  path: Path
  readOnly: boolean
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  const render = props.containerConfig.container.render

  // Container registrations forbid the `'block'` and `'span'` types
  // at the factory level (see `ContainerNodeForType`), so a container
  // node here is always a `PortableTextObject`. The runtime invariant
  // is enforced by registration; expressing it in the type graph
  // would require threading the `_type` literal through dispatch.
  const renderProps: ContainerRenderProps = {
    attributes: props.attributes,
    children: props.children,
    focused,
    node: props.element as PortableTextObject,
    path: props.path,
    readOnly: props.readOnly,
    renderDefault: renderDefaultContainer,
    selected,
  }

  return render ? render(renderProps) : renderDefaultContainer(renderProps)
}
