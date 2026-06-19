import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {serializePath} from '../paths/serialize-path'
import type {
  ContainerConfig,
  ContainerRenderProps,
} from '../renderers/renderer.types'
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

  // Mint the chrome and body bags. The chrome bag is `attributes` -
  // engine-emitted markers (data-pt-block="container", data-pt-path)
  // plus contentEditable={false} and draggable, which together make
  // the wrapper behave like void-block chrome: the browser refuses
  // caret placement on it, and the existing engine path-resolution
  // routes pointer-down events to the container's own path.
  //
  // The body bag carries contentEditable={true} so caret editing
  // still works inside the container's body region. The
  // data-pt-container-children marker is a stable hook for consumer
  // styling but isn't required by the engine.
  const chromeAttributes: Record<string, unknown> = {
    ...props.attributes,
    contentEditable: false,
    draggable: !props.readOnly,
  }
  const childrenAttributes: Record<string, unknown> = {
    'data-pt-container-children': '',
    'contentEditable': true,
  }

  // Container registrations forbid the `'block'` and `'span'` types
  // at the factory level (see `ContainerNodeForType`), so a container
  // node here is always a `PortableTextObject`. The runtime invariant
  // is enforced by registration; expressing it in the type graph
  // would require threading the `_type` literal through dispatch.
  const renderProps: ContainerRenderProps = {
    attributes: chromeAttributes,
    childrenAttributes,
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
